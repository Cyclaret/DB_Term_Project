USE itams;

-- 기존 대기 중복을 확인한다. 결과가 있으면 관리자 화면에서 중복 신청을 처리한 뒤 실행한다.
SELECT employee_id, software_id, COUNT(*) AS pending_count
FROM LicenseRequest
WHERE status = 'PENDING'
GROUP BY employee_id, software_id
HAVING COUNT(*) > 1;

-- 중복이 남아 있으면 ALTER TABLE이 실패하며 기존 신청 데이터는 그대로 보존된다.
ALTER TABLE LicenseRequest
    ADD COLUMN pending_software_id INT GENERATED ALWAYS AS (
        CASE WHEN status = 'PENDING' THEN software_id ELSE NULL END
    ) VIRTUAL,
    ADD UNIQUE KEY uq_licenserequest_pending (employee_id, pending_software_id),
    ALGORITHM=COPY;
