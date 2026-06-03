# Hướng Dẫn Cho Người Mới

Tài liệu này giải thích nhanh cách repository `agent-skills` được tổ chức và cách dùng nó với Codex hoặc các AI coding agent khác.

## Repository Này Dùng Để Làm Gì?

Repository này là một bộ hướng dẫn cho AI coding agent. Thay vì chỉ yêu cầu agent "viết code", repo cung cấp các quy trình làm việc rõ ràng để agent biết khi nào cần viết đặc tả, lập kế hoạch, triển khai, kiểm thử, review và chuẩn bị ship.

Mỗi quy trình được gọi là một **skill**. Skill là file Markdown chứa:

- Khi nào nên dùng skill đó.
- Các bước agent phải làm.
- Các lỗi tư duy thường gặp cần tránh.
- Tiêu chí kiểm chứng trước khi coi công việc là xong.

Mục tiêu là giúp agent làm việc giống một kỹ sư phần mềm có kinh nghiệm hơn: rõ yêu cầu trước khi code, chia nhỏ công việc, kiểm thử đầy đủ, review kỹ và có bằng chứng rằng thay đổi hoạt động đúng.

## Các Thư Mục Chính

### `skills/`

Đây là phần quan trọng nhất của repo.

Mỗi skill nằm trong một thư mục riêng:

```text
skills/<ten-skill>/SKILL.md
```

Ví dụ:

- `skills/spec-driven-development/SKILL.md`: hướng dẫn viết đặc tả trước khi code.
- `skills/planning-and-task-breakdown/SKILL.md`: hướng dẫn chia việc thành các task nhỏ.
- `skills/test-driven-development/SKILL.md`: hướng dẫn viết test và dùng test để chứng minh code đúng.
- `skills/code-review-and-quality/SKILL.md`: hướng dẫn review code theo nhiều góc nhìn.

Khi một task phù hợp với một skill, agent nên đọc và làm theo skill đó thay vì tự xử lý theo cảm tính.

### `agents/`

Thư mục này chứa các persona chuyên biệt cho agent. Persona trả lời câu hỏi: "Agent nên đóng vai ai?"

Các persona hiện có:

- `code-reviewer.md`: đóng vai kỹ sư senior/staff để review code.
- `security-auditor.md`: đóng vai kỹ sư bảo mật để tìm rủi ro bảo mật.
- `test-engineer.md`: đóng vai kỹ sư kiểm thử để đánh giá test và coverage.

Persona khác với skill. Persona là vai trò và góc nhìn. Skill là quy trình phải làm theo.

### `docs/`

Thư mục này chứa tài liệu hướng dẫn sử dụng repo với các công cụ khác nhau.

Ví dụ:

- `getting-started.md`: hướng dẫn chung cho mọi agent.
- `opencode-setup.md`: cách dùng với OpenCode.
- `cursor-setup.md`: cách dùng với Cursor.
- `copilot-setup.md`: cách dùng với GitHub Copilot.
- `skill-anatomy.md`: cấu trúc chuẩn của một skill.

Người mới nên đọc `README.md`, sau đó đọc `docs/getting-started.md` và `docs/skill-anatomy.md`.

### `references/`

Thư mục này chứa tài liệu tham khảo và checklist chi tiết. Các skill có thể dùng những file này khi cần thêm thông tin.

Ví dụ:

- `testing-patterns.md`: mẫu và nguyên tắc viết test.
- `security-checklist.md`: checklist bảo mật.
- `performance-checklist.md`: checklist hiệu năng.
- `accessibility-checklist.md`: checklist accessibility.
- `orchestration-patterns.md`: cách phối hợp skill, persona và command.

Bạn không cần đọc toàn bộ `references/` ngay từ đầu. Hãy mở file phù hợp khi đang làm việc liên quan.

### `.github/workflows/`

Thư mục này chứa GitHub Actions workflow để kiểm tra repo trên GitHub.

Hiện có workflow `test-plugin-install.yml`, dùng để:

- Validate nội dung các skill.
- Validate cấu trúc plugin.
- Kiểm tra việc cài plugin bằng Claude Code.

Nói ngắn gọn, đây là phần tự động kiểm tra để đảm bảo repo vẫn có thể được đóng gói và cài đặt đúng.

## Workflow Cơ Bản

Repo này tổ chức công việc theo vòng đời phát triển phần mềm. Một task lớn thường đi qua các bước sau.

### 1. `spec`

Mục tiêu: hiểu rõ cần xây gì trước khi code.

Ở bước này, agent dùng skill `spec-driven-development` để tạo đặc tả. Đặc tả nên làm rõ:

- Mục tiêu của thay đổi.
- Người dùng hoặc hệ thống bị ảnh hưởng.
- Phạm vi làm và không làm.
- Tiêu chí hoàn thành.
- Rủi ro hoặc giả định quan trọng.

### 2. `plan`

Mục tiêu: chia đặc tả thành các task nhỏ, dễ kiểm chứng.

Agent dùng skill `planning-and-task-breakdown` để biến yêu cầu thành kế hoạch triển khai. Một kế hoạch tốt nên có thứ tự rõ ràng, task nhỏ và tiêu chí kiểm tra cho từng task.

### 3. `build`

Mục tiêu: triển khai theo từng phần nhỏ.

Agent thường dùng:

- `incremental-implementation`: làm từng lát nhỏ, dễ rollback.
- `test-driven-development`: viết hoặc cập nhật test để chứng minh hành vi đúng.

Bước này tránh việc viết một lượng lớn code rồi mới kiểm tra sau.

### 4. `test`

Mục tiêu: chứng minh thay đổi hoạt động đúng.

Agent dùng `test-driven-development` hoặc các skill kiểm thử liên quan để:

- Viết test cho hành vi mới.
- Chạy test hiện có.
- Kiểm tra bug đã được tái hiện và sửa đúng.
- Ghi lại bằng chứng, ví dụ output của lệnh test.

### 5. `review`

Mục tiêu: đánh giá chất lượng trước khi merge hoặc ship.

Agent dùng `code-review-and-quality`, hoặc persona `code-reviewer`, để kiểm tra:

- Correctness: code có đúng hành vi không?
- Readability: code có dễ đọc không?
- Architecture: thiết kế có phù hợp không?
- Security: có rủi ro bảo mật không?
- Performance: có vấn đề hiệu năng không?

### 6. `ship`

Mục tiêu: chuẩn bị đưa thay đổi vào production hoặc phát hành.

Agent dùng `shipping-and-launch` để kiểm tra:

- Tình trạng test, build, lint.
- Rủi ro khi deploy.
- Kế hoạch rollback.
- Monitoring hoặc log cần theo dõi.
- Feature flag hoặc rollout từng phần nếu cần.

## Ví Dụ: Yêu Cầu Codex Dùng Một Skill

Bạn có thể yêu cầu Codex dùng trực tiếp một skill trong repo. Ví dụ, khi muốn sửa bug:

```text
Hãy dùng skill `debugging-and-error-recovery` trong `skills/debugging-and-error-recovery/SKILL.md`.

Bug: endpoint `/api/orders` trả về lỗi 500 khi giỏ hàng trống.

Yêu cầu:
- Đọc skill trước.
- Tái hiện lỗi.
- Tìm nguyên nhân gốc.
- Sửa lỗi nhỏ nhất có thể.
- Thêm test chứng minh lỗi đã được sửa.
- Chạy test liên quan và báo kết quả.
```

Ví dụ khi muốn làm tính năng mới:

```text
Hãy dùng workflow:
1. `spec-driven-development`
2. `planning-and-task-breakdown`
3. `incremental-implementation`
4. `test-driven-development`

Tính năng: thêm trang quản lý profile người dùng.

Trước khi code, hãy tạo spec ngắn và kế hoạch task rõ ràng.
```

## Gợi Ý Cho Người Mới

- Đừng đọc tất cả skill cùng lúc. Hãy bắt đầu với skill phù hợp với việc bạn đang làm.
- Nếu task còn mơ hồ, bắt đầu bằng `spec-driven-development`.
- Nếu task đã rõ nhưng lớn, dùng `planning-and-task-breakdown`.
- Nếu đang sửa bug, dùng `debugging-and-error-recovery`.
- Nếu đang viết code, luôn nghĩ đến `test-driven-development`.
- Nếu chuẩn bị merge, dùng `code-review-and-quality`.
- Nếu chuẩn bị phát hành, dùng `shipping-and-launch`.

Repository này hữu ích nhất khi bạn dùng nó như một bộ quy trình làm việc, không chỉ như tài liệu để đọc. Hãy để agent làm theo từng skill và yêu cầu agent đưa ra bằng chứng kiểm chứng ở cuối mỗi bước.
