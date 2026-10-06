package com.civicfix.controller;

import com.civicfix.model.Role;
import com.civicfix.repo.UserRepository;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final UserRepository users;
    public AdminController(UserRepository users) { this.users = users; }
    @GetMapping("/users") public List<Map<String,Object>> users() {
        return users.findAll().stream().map(u -> Map.<String,Object>of("id", u.getId(), "name", u.getName(), "email", u.getEmail(), "role", u.getRole().name(), "department", u.getDepartment() == null ? "" : u.getDepartment())).toList();
    }
    @PatchMapping("/users/{id}/role") public Map<String,Object> updateRole(@PathVariable Long id, @RequestBody RoleUpdate update) {
        var user = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Role newRole;
        try { newRole = Role.valueOf(update.role()); }
        catch (RuntimeException ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role must be CITIZEN, DEPARTMENT_OFFICER, or ADMIN"); }
        if (newRole == Role.DEPARTMENT_OFFICER && (update.department() == null || update.department().isBlank()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department officers need a department assignment");
        if (user.getRole() == Role.ADMIN && newRole != Role.ADMIN && users.countByRole(Role.ADMIN) <= 1)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "At least one administrator must remain");
        user.setRole(newRole);
        user.setDepartment(update.department() == null || update.department().isBlank() ? null : update.department().trim());
        users.save(user);
        return Map.of("id", user.getId(), "role", user.getRole().name(), "department", user.getDepartment() == null ? "" : user.getDepartment());
    }
    public record RoleUpdate(String role, String department) {}
}
