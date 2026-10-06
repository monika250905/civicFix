package com.civicfix.repo;

import com.civicfix.model.ComplaintEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplaintEventRepository extends JpaRepository<ComplaintEvent, Long> {
    List<ComplaintEvent> findByComplaintIdOrderByCreatedAtAsc(Long complaintId);
}
