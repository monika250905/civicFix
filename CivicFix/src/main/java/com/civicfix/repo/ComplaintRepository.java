package com.civicfix.repo;
import com.civicfix.model.Complaint;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ComplaintRepository extends JpaRepository<Complaint,Long> {
    List<Complaint> findByReporterIdOrderByCreatedAtDesc(Long reporterId);
    List<Complaint> findByDepartmentIgnoreCaseOrderByCreatedAtDesc(String department);
}
