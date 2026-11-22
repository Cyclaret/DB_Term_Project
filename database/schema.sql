-- ============================================
-- IT Asset Management System (ITAMS)
-- Database Schema
-- MySQL 8.4
-- ============================================

CREATE DATABASE IF NOT EXISTS itams
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE itams;


-- ============================================
-- 1. Employee
-- 직원 관리
-- ============================================

CREATE TABLE Employee (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    department VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,

    CONSTRAINT chk_employee_role
        CHECK (role IN ('ADMIN', 'USER'))
);


-- ============================================
-- 2. AssetCategory
-- IT 자산 카테고리
-- ============================================

CREATE TABLE AssetCategory (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE
);


-- ============================================
-- 3. Software
-- 소프트웨어 정보
-- ============================================

CREATE TABLE Software (
    software_id INT AUTO_INCREMENT PRIMARY KEY,
    software_name VARCHAR(100) NOT NULL,
    vendor VARCHAR(100) NOT NULL
);


-- ============================================
-- 4. Asset
-- 개별 IT 자산
-- ============================================

CREATE TABLE Asset (
    asset_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    asset_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT fk_asset_category
        FOREIGN KEY (category_id)
        REFERENCES AssetCategory(category_id),

    CONSTRAINT chk_asset_status
        CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE'))
);


-- ============================================
-- 5. License
-- 소프트웨어 라이선스
-- ============================================

CREATE TABLE License (
    license_id INT AUTO_INCREMENT PRIMARY KEY,
    software_id INT NOT NULL,
    total_seats INT NOT NULL,
    expiration_date DATE NOT NULL,

    CONSTRAINT fk_license_software
        FOREIGN KEY (software_id)
        REFERENCES Software(software_id),

    CONSTRAINT chk_license_seats
        CHECK (total_seats >= 1)
);


-- ============================================
-- 6. AssetRequest
-- IT 자산 신청
-- ============================================

CREATE TABLE AssetRequest (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    category_id INT NOT NULL,
    request_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    processed_at DATETIME NULL,
    processed_by INT NULL,

    CONSTRAINT fk_assetrequest_employee
        FOREIGN KEY (employee_id)
        REFERENCES Employee(employee_id),

    CONSTRAINT fk_assetrequest_category
        FOREIGN KEY (category_id)
        REFERENCES AssetCategory(category_id),

    CONSTRAINT fk_assetrequest_processor
        FOREIGN KEY (processed_by)
        REFERENCES Employee(employee_id),

    CONSTRAINT chk_assetrequest_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),

    CONSTRAINT chk_assetrequest_processing
        CHECK (
            (
                status = 'PENDING'
                AND processed_at IS NULL
                AND processed_by IS NULL
            )
            OR
            (
                status IN ('APPROVED', 'REJECTED')
                AND processed_at IS NOT NULL
                AND processed_by IS NOT NULL
            )
        )
);


-- ============================================
-- 7. LicenseRequest
-- 소프트웨어 라이선스 신청
-- ============================================

CREATE TABLE LicenseRequest (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    software_id INT NOT NULL,
    request_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    processed_at DATETIME NULL,
    processed_by INT NULL,

    -- 승인 대기인 신청만 직원과 소프트웨어 조합을 고유하게 유지한다.
    pending_software_id INT GENERATED ALWAYS AS (
        CASE WHEN status = 'PENDING' THEN software_id ELSE NULL END
    ) VIRTUAL,
    UNIQUE KEY uq_licenserequest_pending (employee_id, pending_software_id),

    CONSTRAINT fk_licenserequest_employee
        FOREIGN KEY (employee_id)
        REFERENCES Employee(employee_id),

    CONSTRAINT fk_licenserequest_software
        FOREIGN KEY (software_id)
        REFERENCES Software(software_id),

    CONSTRAINT fk_licenserequest_processor
        FOREIGN KEY (processed_by)
        REFERENCES Employee(employee_id),

    CONSTRAINT chk_licenserequest_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),

    CONSTRAINT chk_licenserequest_processing
        CHECK (
            (
                status = 'PENDING'
                AND processed_at IS NULL
                AND processed_by IS NULL
            )
            OR
            (
                status IN ('APPROVED', 'REJECTED')
                AND processed_at IS NOT NULL
                AND processed_by IS NOT NULL
            )
        )
);


-- ============================================
-- 8. AssetAssignment
-- IT 자산 할당 및 반납 이력
-- ============================================

CREATE TABLE AssetAssignment (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    asset_id INT NOT NULL,
    request_id INT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    returned_at DATETIME NULL,

    CONSTRAINT fk_assetassignment_employee
        FOREIGN KEY (employee_id)
        REFERENCES Employee(employee_id),

    CONSTRAINT fk_assetassignment_asset
        FOREIGN KEY (asset_id)
        REFERENCES Asset(asset_id),

    CONSTRAINT fk_assetassignment_request
        FOREIGN KEY (request_id)
        REFERENCES AssetRequest(request_id),

    CONSTRAINT uq_assetassignment_request
        UNIQUE (request_id),

    CONSTRAINT chk_assetassignment_date
        CHECK (
            returned_at IS NULL
            OR returned_at >= assigned_at
        )
);


-- ============================================
-- 9. LicenseAssignment
-- 라이선스 할당 및 회수 이력
-- ============================================

CREATE TABLE LicenseAssignment (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    license_id INT NOT NULL,
    request_id INT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    returned_at DATETIME NULL,

    CONSTRAINT fk_licenseassignment_employee
        FOREIGN KEY (employee_id)
        REFERENCES Employee(employee_id),

    CONSTRAINT fk_licenseassignment_license
        FOREIGN KEY (license_id)
        REFERENCES License(license_id),

    CONSTRAINT fk_licenseassignment_request
        FOREIGN KEY (request_id)
        REFERENCES LicenseRequest(request_id),

    CONSTRAINT uq_licenseassignment_request
        UNIQUE (request_id),

    CONSTRAINT chk_licenseassignment_date
        CHECK (
            returned_at IS NULL
            OR returned_at >= assigned_at
        )
);


-- ============================================
-- Schema Verification
-- ============================================

-- 생성된 테이블 확인
SHOW TABLES;

-- 외래 키 관계 확인
SELECT
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'itams'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;