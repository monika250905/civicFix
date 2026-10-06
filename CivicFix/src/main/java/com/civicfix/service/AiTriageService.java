package com.civicfix.service;

import com.civicfix.model.Priority;
import java.util.Locale;
import java.util.List;
import org.springframework.stereotype.Service;

/** Explainable local text triage. No external model or API credential is required. */
@Service
public class AiTriageService {
    private static final List<CategoryRule> CATEGORIES = List.of(
        new CategoryRule("Water & Drainage", new String[]{"water", "leak", "pipe", "drain", "sewer", "flood", "burst"}),
        new CategoryRule("Electrical", new String[]{"light", "electric", "power", "wire", "cable", "outage", "lamp"}),
        new CategoryRule("Roads & Transport", new String[]{"road", "pothole", "traffic", "sidewalk", "bridge", "signal", "pavement"}),
        new CategoryRule("Sanitation", new String[]{"trash", "garbage", "waste", "bin", "rubbish", "dump", "litter"}),
        new CategoryRule("Public Safety", new String[]{"unsafe", "hazard", "fire", "exposed", "collapse", "injury", "danger"})
    );

    public Triage analyze(String title, String description) {
        String text = ((title == null ? "" : title) + " " + (description == null ? "" : description))
            .toLowerCase(Locale.ROOT);
        String category = "General Services";
        int best = 0;
        for (var entry : CATEGORIES) {
            int hits = 0;
            for (String term : entry.signals()) if (text.contains(term)) hits++;
            if (hits > best) { best = hits; category = entry.name(); }
        }

        int score = 15 + Math.min(best * 8, 24);
        String reason = best == 0 ? "Limited issue details; staff review is recommended." : "Matched " + best + " " + category.toLowerCase(Locale.ROOT) + " issue signal(s).";
        String[] critical = {"emergency", "life threatening", "person trapped", "fire", "electrocution", "gas leak", "injured", "collapse"};
        String[] high = {"dangerous", "blocked", "flooding", "school", "hospital", "no water", "exposed wire", "large pothole", "urgent"};
        for (String term : critical) if (text.contains(term)) { score += 48; reason += " Critical safety signal: " + term + "."; break; }
        for (String term : high) if (text.contains(term)) { score += 22; reason += " Elevated impact signal: " + term + "."; break; }
        if (text.contains("many homes") || text.contains("entire street") || text.contains("multiple")) score += 10;
        score = Math.min(100, score);
        Priority priority = score >= 75 ? Priority.CRITICAL : score >= 50 ? Priority.HIGH : score >= 25 ? Priority.MEDIUM : Priority.LOW;
        String department = switch (category) {
            case "Water & Drainage" -> "Water Works";
            case "Electrical" -> "Electrical Services";
            case "Roads & Transport" -> "Public Works";
            case "Sanitation" -> "Sanitation";
            case "Public Safety" -> "Public Safety";
            default -> "General Services";
        };
        int confidence = best == 0 ? 35 : Math.min(96, 62 + best * 9);
        return new Triage(category, priority, score, department, confidence, reason, "civicfix-rules-v1", confidence < 55 || priority == Priority.CRITICAL);
    }

    public record Triage(String category, Priority priority, int urgencyScore, String department,
                         int confidence, String rationale, String version, boolean reviewRequired) {}
    private record CategoryRule(String name, String[] signals) {}
}
