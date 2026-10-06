package com.civicfix.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ComplaintRequest(@NotBlank @Size(max=160) String title,
                               @NotBlank @Size(max=3000) String description,
                               @Size(max=300) String address,
                               Double latitude, Double longitude) {}
