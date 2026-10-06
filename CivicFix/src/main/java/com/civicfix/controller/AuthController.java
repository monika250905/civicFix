package com.civicfix.controller;

import com.civicfix.dto.*;
import com.civicfix.model.User;
import com.civicfix.repo.UserRepository;
import com.civicfix.service.JwtService;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository users; private final PasswordEncoder encoder; private final JwtService jwt;
    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt) { this.users=users; this.encoder=encoder; this.jwt=jwt; }
    @PostMapping("/register") public ResponseEntity<?> register(@Valid @RequestBody AuthRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.findByEmail(email).isPresent()) return ResponseEntity.status(409).body(Map.of("error", "Email is already registered"));
        User user = new User(); user.setName(request.name().trim()); user.setEmail(email);
        user.setPasswordHash(encoder.encode(request.password())); users.save(user);
        return ResponseEntity.status(201).body(token(user));
    }
    @PostMapping("/login") public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        return users.findByEmail(request.email().trim().toLowerCase()).filter(u -> encoder.matches(request.password(), u.getPasswordHash()))
            .<ResponseEntity<?>>map(u -> ResponseEntity.ok(token(u)))
            .orElseGet(() -> ResponseEntity.status(401).body(Map.of("error", "Invalid email or password")));
    }
    private Map<String,Object> token(User user) {
        Map<String,Object> result = new HashMap<>();
        result.put("token", jwt.create(user.getEmail(), user.getRole().name())); result.put("role", user.getRole().name());
        result.put("name", user.getName()); result.put("email", user.getEmail()); result.put("department", user.getDepartment());
        return result;
    }
}
