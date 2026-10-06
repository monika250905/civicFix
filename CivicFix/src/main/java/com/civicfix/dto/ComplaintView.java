package com.civicfix.dto;

import com.civicfix.model.Complaint;
import java.time.Instant;

public record ComplaintView(Long id, String referenceCode, String title, String description,
                            String category, String priority, String status, String department,
                            Double latitude, Double longitude, String address, Integer aiConfidence,
                            Integer urgencyScore, String triageRationale, String triageVersion, boolean reviewRequired,
                            String reporterName, Instant createdAt, Instant updatedAt) {
    public static ComplaintView from(Complaint c) {
        return new ComplaintView(c.getId(), c.getReferenceCode(), c.getTitle(), c.getDescription(),
            c.getCategory(), c.getPriority() == null ? null : c.getPriority().name(), c.getStatus().name(),
            c.getDepartment(), c.getLatitude(), c.getLongitude(), c.getAddress(), c.getAiConfidence(),
            c.getUrgencyScore(), c.getTriageRationale(), c.getTriageVersion(), c.isTriageReviewRequired(),
            c.getReporter() == null ? "" : c.getReporter().getName(), c.getCreatedAt(), c.getUpdatedAt());
    }
}
