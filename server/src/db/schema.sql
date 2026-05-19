-- SheetMetalAI Database Schema

-- 会话表
CREATE TABLE IF NOT EXISTS chat_sessions (
  id VARCHAR(36) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status ENUM('active', 'completed', 'error') DEFAULT 'active',
  user_message TEXT,
  metadata JSON
);

-- 图纸表
CREATE TABLE IF NOT EXISTS drawings (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36),
  original_filename VARCHAR(255),
  file_type VARCHAR(50),
  file_size INT,
  storage_path VARCHAR(500),
  drawing_style VARCHAR(100),
  company_name VARCHAR(200),
  drawing_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);

-- 提取结果表
CREATE TABLE IF NOT EXISTS extraction_results (
  id VARCHAR(36) PRIMARY KEY,
  drawing_id VARCHAR(36),
  session_id VARCHAR(36),
  identified_type VARCHAR(50),
  confidence DECIMAL(3,2),
  extracted_params JSON,
  ai_reasoning TEXT,
  is_corrected BOOLEAN DEFAULT FALSE,
  corrected_params JSON,
  correction_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (drawing_id) REFERENCES drawings(id),
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);

-- 经验教训表 (用于RAG)
CREATE TABLE IF NOT EXISTS lessons_learned (
  id VARCHAR(36) PRIMARY KEY,
  drawing_id VARCHAR(36),
  error_type VARCHAR(100),
  error_description TEXT,
  correct_value TEXT,
  lesson_text TEXT,
  drawing_features JSON,
  embedding_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (drawing_id) REFERENCES drawings(id)
);

-- 向量存储表 (如果使用MySQL向量扩展)
CREATE TABLE IF NOT EXISTS knowledge_vectors (
  id VARCHAR(36) PRIMARY KEY,
  lesson_id VARCHAR(36),
  vector_data JSON,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons_learned(id)
);

-- 索引
CREATE INDEX idx_drawings_session ON drawings(session_id);
CREATE INDEX idx_extraction_session ON extraction_results(session_id);
CREATE INDEX idx_lessons_drawing ON lessons_learned(drawing_id);
