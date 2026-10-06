package com.civicfix.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class ComplaintEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) private Complaint complaint;
    @Column(nullable = false) private String actorEmail;
    @Column(nullable = false) private String eventType;
    @Column(length = 1000) private String details;
    @Column(nullable = false) private Instant createdAt = Instant.now();
    protected ComplaintEvent() {}
    public ComplaintEvent(Complaint complaint, String actorEmail, String eventType, String details) {
        this.complaint = complaint; this.actorEmail = actorEmail; this.eventType = eventType; this.details = details;
    }
    public Long getId() { return id; }
    public String getActorEmail() { return actorEmail; }
    public String getEventType() { return eventType; }
    public String getDetails() { return details; }
    public Instant getCreatedAt() { return createdAt; }
}
