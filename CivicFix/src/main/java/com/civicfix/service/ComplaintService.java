package com.civicfix.service;

import com.civicfix.dto.ComplaintRequest;
import com.civicfix.dto.ComplaintView;
import com.civicfix.model.*;
import com.civicfix.repo.*;
import java.security.Principal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ComplaintService {
    private final ComplaintRepository complaints;
    private final UserRepository users;
    private final ComplaintEventRepository events;
    private final AiTriageService ai;

    public ComplaintService(ComplaintRepository complaints, UserRepository users,
                            ComplaintEventRepository events, AiTriageService ai) {
        this.complaints = complaints; this.users = users; this.events = events; this.ai = ai;
    }

    private User actor(Principal principal) {
        return users.findByEmail(principal.getName()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
    private Complaint visible(Long id, User actor) {
        Complaint c = complaints.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (actor.getRole() == Role.ADMIN) return c;
        if (actor.getRole() == Role.CITIZEN && c.getReporter().getId().equals(actor.getId())) return c;
        if (actor.getRole() == Role.DEPARTMENT_OFFICER && actor.getDepartment() != null &&
            actor.getDepartment().equalsIgnoreCase(c.getDepartment())) return c;
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access this complaint");
    }

    @Transactional
    public ComplaintView submit(ComplaintRequest request, Principal principal) {
        User reporter = actor(principal);
        if (reporter.getRole() != Role.CITIZEN) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        validateCoordinates(request.latitude(), request.longitude());
        var triage = ai.analyze(request.title(), request.description());
        Complaint c = new Complaint();
        c.setReferenceCode("CF-" + java.time.Year.now() + "-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        c.setTitle(request.title().trim()); c.setDescription(request.description().trim());
        c.setAddress(request.address()); c.setLatitude(request.latitude()); c.setLongitude(request.longitude());
        c.setCategory(triage.category()); c.setPriority(triage.priority()); c.setDepartment(triage.department());
        c.setAiConfidence(triage.confidence()); c.setUrgencyScore(triage.urgencyScore());
        c.setTriageRationale(triage.rationale()); c.setTriageVersion(triage.version());
        c.setTriageReviewRequired(triage.reviewRequired()); c.setReporter(reporter);
        c = complaints.save(c);
        events.save(new ComplaintEvent(c, principal.getName(), "SUBMITTED", "Report created and triaged."));
        return ComplaintView.from(c);
    }

    @Transactional(readOnly = true)
    public List<ComplaintView> visibleComplaints(Principal principal) {
        User user = actor(principal);
        List<Complaint> result = switch (user.getRole()) {
            case ADMIN -> complaints.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
            case CITIZEN -> complaints.findByReporterIdOrderByCreatedAtDesc(user.getId());
            case DEPARTMENT_OFFICER -> user.getDepartment() == null ? List.of() : complaints.findByDepartmentIgnoreCaseOrderByCreatedAtDesc(user.getDepartment())
                .stream().sorted(java.util.Comparator.comparing(Complaint::getUrgencyScore,
                    java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder()))
                    .thenComparing(Complaint::getCreatedAt, java.util.Comparator.reverseOrder())).toList();
        };
        return result.stream().map(ComplaintView::from).toList();
    }

    @Transactional
    public ComplaintView updateStatus(Long id, ComplaintStatus status, String details, Principal principal) {
        User user = actor(principal);
        if (user.getRole() == Role.CITIZEN) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if ((status == ComplaintStatus.RESOLVED || status == ComplaintStatus.REJECTED) && (details == null || details.isBlank()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A resolution or rejection note is required");
        Complaint c = visible(id, user);
        ComplaintStatus old = c.getStatus();
        if (!validTransition(old, status)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Invalid status transition");
        c.setStatus(status);
        c = complaints.save(c);
        events.save(new ComplaintEvent(c, principal.getName(), "STATUS_CHANGED", old + " -> " + status + (details == null || details.isBlank() ? "" : ": " + details.trim())));
        return ComplaintView.from(c);
    }

    @Transactional(readOnly = true)
    public List<ComplaintEvent> events(Long id, Principal principal) {
        Complaint c = visible(id, actor(principal));
        return events.findByComplaintIdOrderByCreatedAtAsc(c.getId());
    }

    private boolean validTransition(ComplaintStatus from, ComplaintStatus to) {
        if (from == to) return false;
        return switch (from) {
            case UNDER_REVIEW -> to == ComplaintStatus.ASSIGNED || to == ComplaintStatus.REJECTED;
            case ASSIGNED -> to == ComplaintStatus.IN_PROGRESS || to == ComplaintStatus.UNDER_REVIEW || to == ComplaintStatus.REJECTED;
            case IN_PROGRESS -> to == ComplaintStatus.RESOLVED || to == ComplaintStatus.ASSIGNED;
            case RESOLVED -> to == ComplaintStatus.IN_PROGRESS;
            case REJECTED -> to == ComplaintStatus.UNDER_REVIEW;
        };
    }
    private void validateCoordinates(Double lat, Double lon) {
        if ((lat == null) != (lon == null) || (lat != null && (lat < -90 || lat > 90 || lon < -180 || lon > 180)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide both valid latitude and longitude");
    }
}
