USE itams;

-- 1. 직원
INSERT INTO Employee (name, department, role)
VALUES
    ('김관리', 'IT', 'ADMIN'),
    ('이민수', '개발팀', 'USER'),
    ('박지현', '디자인팀', 'USER');

-- 2. 자산 카테고리
INSERT INTO AssetCategory (category_name)
VALUES
    ('노트북'),
    ('모니터');

-- 3. IT 자산
INSERT INTO Asset (category_id, asset_name)
VALUES
    (1, 'MacBook Air'),
    (2, 'Dell Monitor');

-- 4. 소프트웨어
INSERT INTO Software (software_name, vendor)
VALUES
    ('IntelliJ IDEA', 'JetBrains');

-- 5. 라이선스
INSERT INTO License (software_id, total_seats, expiration_date)
VALUES
    (1, 3, '2027-12-31');