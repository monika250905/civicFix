package com.civicfix.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final byte[] secret;
    private final long expiration;
    public JwtService(@Value("${app.jwt-secret}") String secret, @Value("${app.jwt-expiration-ms}") long expiration) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8); this.expiration = expiration;
        Keys.hmacShaKeyFor(this.secret);
    }
    public String create(String email, String role) {
        return Jwts.builder().subject(email).claim("role", role).issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(Keys.hmacShaKeyFor(secret)).compact();
    }
    public Claims parse(String token) {
        return Jwts.parser().verifyWith(Keys.hmacShaKeyFor(secret)).build().parseSignedClaims(token).getPayload();
    }
}
