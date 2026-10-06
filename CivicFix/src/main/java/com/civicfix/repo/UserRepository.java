package com.civicfix.repo;
import com.civicfix.model.Role;
import com.civicfix.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface UserRepository extends JpaRepository<User,Long> {
    Optional<User> findByEmail(String email);
    long countByRole(Role role);
}
