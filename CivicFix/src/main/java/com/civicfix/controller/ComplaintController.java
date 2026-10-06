package com.civicfix.controller;

import com.civicfix.dto.ComplaintRequest;
import com.civicfix.dto.ComplaintView;
import com.civicfix.model.ComplaintStatus;
import com.civicfix.repo.ComplaintEventRepository;
import com.civicfix.service.AiTriageService;
import com.civicfix.service.ComplaintService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {
    private final ComplaintService service;
    private final AiTriageService ai;
    private final ComplaintEventRepository events;

    public ComplaintController(ComplaintService service, AiTriageService ai, ComplaintEventRepository events) {
        this.service = service; this.ai = ai; this.events = events;
    }
    @GetMapping public List<ComplaintView> list(Principal principal) { return service.visibleComplaints(principal); }
    @GetMapping("/mine") public List<ComplaintView> mine(Principal principal) { return service.visibleComplaints(principal); }
    @PostMapping public ComplaintView submit(@Valid @RequestBody ComplaintRequest request, Principal principal) { return service.submit(request, principal); }
    @PostMapping("/triage") public AiTriageService.Triage triage(@Valid @RequestBody ComplaintRequest request) {
        return ai.analyze(request.title(), request.description());
    }
    @PatchMapping("/{id}/status") public ComplaintView status(@PathVariable Long id, @Valid @RequestBody StatusUpdate update, Principal principal) {
        if (update.value() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status is required");
        return service.updateStatus(id, update.value(), update.details(), principal);
    }
    @GetMapping("/{id}/events") public List<EventView> events(@PathVariable Long id, Principal principal) {
        return service.events(id, principal).stream().map(e -> new EventView(e.getId(), e.getEventType(), e.getDetails(), e.getActorEmail(), e.getCreatedAt())).toList();
    }
    public record StatusUpdate(ComplaintStatus value, @Size(max=1000) String details) {}
    public record EventView(Long id, String eventType, String details, String actorEmail, java.time.Instant createdAt) {}
}
