# KB Research — Chuẩn bị cho Tuần 3 (CLI ↔ Knowledge Base API)

> Tài liệu nghiên cứu trước khi viết test cho `kb search | list | retrieve | add`.
> Các mục "Đề xuất" là **quyết định thiết kế tạm thời**. Đề bài không quy định những điểm này, nên cần kiểm chứng với KB API thật (curl) hoặc hỏi mentor, rồi chốt vào `DECISIONS.md`.

## Mục lục
1. [KB là gì](#1-kb-là-gì)
2. [Cách tổ chức tài liệu](#2-cách-tổ-chức-tài-liệu)
3. [Hệ thống thực tế: Odoo Knowledge, Confluence](#3-hệ-thống-thực-tế)
4. [KB trong Scenario 1 (Login Issue) — nối tuần 3 → 4 → 5](#4-kb-trong-scenario-1-login-issue)
5. [Search hoạt động như thế nào](#5-search-hoạt-động-như-thế-nào)
6. [Edge case và cách test](#6-edge-case-và-cách-test)
7. [Câu hỏi còn mở](#7-câu-hỏi-còn-mở--cần-kiểm-chứng)

---

## 1. KB là gì

**Knowledge Base (KB)** là kho tri thức đã được chọn lọc để **tra cứu khi cần hành động**: cách xử lý một lỗi, mẫu email trả lời khách, quy trình reset tài khoản, ai phụ trách hệ thống nào.

**Vai trò trong support/vận hành:**
- Trả lời nhanh và nhất quán: cùng một runbook, cùng một mẫu email cho cả team.
- Giảm escalate, giảm phụ thuộc vào kiến thức nằm trong đầu một người.
- Khép vòng bước 7 (Trend Analysis) của quy trình 7 bước: pattern tìm được ghi thành bài KB.
- Self-service: một số bài có thể mở cho user tự đọc.

**So sánh:**

| | KB | Wiki | File share |
|---|---|---|---|
| Mục đích | Tra cứu để giải quyết việc cụ thể | Cộng tác, ghi chép đủ thứ | Lưu trữ file |
| Đơn vị nội dung | Bài ngắn, một vấn đề một bài, có cấu trúc | Trang tự do | File nhị phân |
| Kiểm soát chất lượng | Có duyệt, có owner, cập nhật theo quy trình | Ai cũng sửa, dễ lỗi thời | Gần như không |
| Tìm kiếm | Tối ưu cho search, gắn vào ticket | Có nhưng nhiều nhiễu | Theo tên file/thư mục |

Ranh giới thực tế khá mờ (nhiều công ty dựng KB bên trong wiki). Khác biệt chủ yếu ở **cách dùng và kỷ luật nội dung**.

## 2. Cách tổ chức tài liệu

| Cách | Ưu | Nhược |
|---|---|---|
| **Phân cấp theo đường dẫn** (`nodePath: /templates/email`) | Dễ duyệt, mỗi tài liệu có vị trí rõ, gán quyền/owner theo nhánh | Một tài liệu chỉ ở một chỗ; cây sâu khó tìm; đổi cấu trúc làm vỡ đường dẫn |
| **Theo tag** | Một tài liệu thuộc nhiều nhóm; lọc kết hợp linh hoạt | Dễ loạn tag (`lms`/`LMS`/`e-learning`); không có cảm giác "đang ở đâu" |
| **Phẳng + search** | Đơn giản | KB lớn thì chỉ tìm được khi biết đúng từ khoá; khó quản lý owner |

Bằng chứng từ dữ liệu tuần 5: khoảng 49% ticket trong `sample.xlsx` không có tag. Nếu chỉ dựa vào tag thì gần nửa nội dung "biến mất".

**Kết luận:** thực tế dùng kết hợp — cây nông (2–3 cấp) để duyệt và phân quyền, tag để phân loại chéo, search để tìm nhanh. Model tuần 3 đúng kiểu này: `Document` có cả `nodePath` lẫn `tags[]`, kèm lệnh `search`.

## 3. Hệ thống thực tế

### Odoo Knowledge
- Đơn vị nội dung là **article**: tiêu đề + thân HTML (text, ảnh, link, bản ghi từ model khác, template).
- **Cây phân cấp**: parent article và nested article.
- **Sidebar chia theo quyền**: Workspace (mọi user nội bộ), Shared (được chia sẻ), Private (chỉ mình).
- **Quyền đi theo cây**: nested article kế thừa quyền của parent; properties áp cho nhóm bài con.
- **Gắn với nghiệp vụ**: article mở được từ form view của các app Odoo khác. MindX dùng Odoo Helpdesk nên KB có thể đi cạnh ticket.

### Confluence
- Cấp ngoài là **Space** (theo team/dự án); space không lồng nhau, phân loại space bằng label.
- Trong space là **page tree** cha–con, có thêm **folder** để gom nội dung.
- **Label** (tag) không loại trừ nhau; dùng để tạo danh sách động.
- Khuyến nghị: page tree không quá 3–4 cấp; space tài liệu nên dùng cấu trúc phẳng + label + search.

**Tóm lại:** cả hai dùng mô hình **cây + quyền theo nhánh**; Confluence nhấn mạnh label, Odoo nhấn mạnh gắn KB với dữ liệu nghiệp vụ.

## 4. KB trong Scenario 1 (Login Issue)

**Ý tưởng:** ticket Odoo là nơi xử lý từng trường hợp, KB là nơi lưu cách xử lý, CLI tuần 3 là cách lấy kiến thức ra nhanh.

### Bộ tài liệu đề xuất (dùng luôn làm seed cho MockKBClient)

| docId | title | nodePath | tags |
|---|---|---|---|
| `doc-001` | Runbook: Xử lý lỗi đăng nhập LMS | `/runbooks/login` | `login`, `lms`, `teacher` |
| `doc-002` | Email ACK – Login issue | `/templates/email` | `login`, `ack` |
| `doc-003` | Email resolution – Đã reset mật khẩu | `/templates/email` | `login`, `resolution` |

Tên node `/runbooks/login` là đề xuất; có thể đổi thành `/docs/guides/login` cho khớp ví dụ trong đề.

Nội dung `doc-001` (runbook):

```markdown
# Runbook: Xử lý lỗi đăng nhập LMS
Class of Service: Standard (1 user) — nâng lên nếu nhiều user cùng báo
Workaround cho user: thử Incognito, kiểm tra đúng URL lms.mindx.edu.vn

## Chẩn đoán
Kiểm tra trạng thái tài khoản trên Base.

## Xử lý theo trạng thái
- Active → reset password, gửi email resolution (doc-003)
- Deactivated + vẫn đang làm việc → xác minh với HR/manager → reactivate + reset
- Đã nghỉ việc → giải thích cho người báo, đóng ticket

## Ghi chú pattern
Tài khoản tự deactivate sau 30 ngày không hoạt động → ứng viên automation (tuần 5)
```

### Dùng KB trong 7 bước

| Bước | Việc làm | Dùng KB |
|---|---|---|
| 1. Reception (< 15') | Tạo ticket, tag `login, LMS, teacher` | `kb search "login" --top-k 3` để tìm runbook và tag chuẩn |
| 2. Initial Response (< 30') | Gửi email ACK | `kb retrieve doc-002` (mẫu không có ETA cố định) |
| 3. Diagnosis | Check Base | `kb retrieve doc-001`, làm theo cây quyết định |
| 4. Resolution | Reset / reactivate | Runbook nhắc bước xác minh HR |
| 5–6. Communication, Follow-up | Email resolution, xác nhận | `kb retrieve doc-003` |
| 7. Trend Analysis | Ghi pattern | Cập nhật runbook hoặc `kb add --file login-pattern.md --path /runbooks/login --tags login,pattern` |

Vòng khép kín: **ticket dùng KB để xử lý, ticket lại làm giàu KB**.

### Nối sang tuần 5
Bước Auto-Response của automation Login Issue có thể lấy mẫu email từ KB (`/retrieve doc-003`) thay vì hard-code trong script:
- Sửa câu chữ chỉ cần sửa trên KB, không sửa code.
- Xử lý tay và automation dùng cùng nội dung.
- Bài KB giải thích automation (yêu cầu tuần 5) đặt cạnh runbook ở `/runbooks/login`.

**Tuần 3** xây công cụ truy cập KB → **tuần 4** dùng KB khi xử lý tay, thu pattern → **tuần 5** tự động hoá dựa trên chính KB đó.

Lưu ý: plan tuần 4 không bắt buộc dùng KB (đây là phần làm thêm); kết quả check Base là giả định, Odoo là demo, KB chỉ chứa nội dung mẫu, không có tên/email người thật.

## 5. Search hoạt động như thế nào

### 5.1 Keyword / full-text search

| Quyết định | Lựa chọn | Đề xuất cho mock |
|---|---|---|
| Khớp chuỗi con hay theo từ | Chuỗi con (`"log"` khớp "login", "blog") dễ cài nhưng nhiều rác; theo từ chính xác hơn nhưng dễ bỏ sót | **Chuỗi con** |
| Hoa thường | Gần như mọi hệ thống không phân biệt | **Không phân biệt** |
| Dấu tiếng Việt | "dang nhap" nên tìm ra "Đăng nhập" | **Không phân biệt dấu** |
| Trường tìm kiếm | Title / tags / content | **Cả ba** |

Full-text search thật (Elasticsearch, PostgreSQL) còn bỏ stop word và đưa từ về gốc; mock không cần.

```ts
const normalize = (s: string) =>
  s.toLowerCase()
   .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu
   .replace(/đ/g, 'd');                               // đ không tách bằng NFD
```

### 5.2 Semantic search: embedding, vector, topK

- **Vấn đề:** "không vào được tài khoản" và "Xử lý lỗi đăng nhập LMS" cùng nghĩa nhưng không chung từ nào, keyword search trả rỗng.
- **Embedding:** mô hình AI biến một đoạn văn thành một dãy số (**vector**) sao cho các đoạn **cùng nghĩa có vector gần nhau**. Hình dung như toạ độ trên một "bản đồ ý nghĩa" nhiều chiều.
- **Cách tìm:** tính sẵn vector cho mọi tài liệu → tính vector cho query → đo độ gần (thường là cosine similarity, càng cao càng giống nghĩa) → sắp xếp giảm dần.
- **`topK`:** chỉ lấy K kết quả điểm cao nhất. Semantic search luôn tìm được "điểm gần nhất" kể cả khi không liên quan, nên hệ thống thật thường thêm **ngưỡng điểm tối thiểu**.
- Trong bài tuần 3, `topK` áp dụng cho cả keyword search (xếp hạng rồi cắt K kết quả đầu). **Mock không cần embedding** — mock chỉ cần đúng hợp đồng input/output.

### 5.3 Ranking

- Khớp ở **title nên xếp trên** khớp ở content (*field boosting*): title là tóm tắt có chủ đích, còn content có thể chỉ nhắc qua.
- Thứ tự đề xuất: **title > tags > content**.
- Hệ thống thật dùng BM25 (tần suất từ, độ hiếm của từ, độ dài tài liệu); mock dùng luật đơn giản, đoán trước được.
- **Tie-break bắt buộc** để test ổn định: cùng điểm thì xếp theo `id` tăng dần.

### 5.4 `matchType`

Đề chỉ ghi `SearchResult { document, matchType }`, **không liệt kê giá trị**, và ví dụ response `/search` không có trường này. Ba cách hiểu:

| Cách hiểu | Giá trị |
|---|---|
| Khớp ở trường nào | `"title"` \| `"tag"` \| `"content"` |
| Khớp chặt đến đâu | `"exact"` \| `"partial"` |
| Khớp bằng cách nào | `"keyword"` \| `"semantic"` \| `"hybrid"` |

Xác định bằng cách gọi API thật trước:

```bash
curl -X POST "$KB_API_URL/search" -H "Content-Type: application/json" \
     -d '{"query": "login", "topK": 3}'
```

**Mock tạm dùng cách hiểu 1**, trả trường ưu tiên cao nhất mà tài liệu khớp:

```ts
type MatchType = 'title' | 'tag' | 'content';
const SCORE: Record<MatchType, number> = { title: 3, tag: 2, content: 1 };

function matchOf(doc: Document, q: string): MatchType | null {
  const nq = normalize(q);
  if (normalize(doc.title).includes(nq)) return 'title';
  if (doc.tags.some(t => normalize(t).includes(nq))) return 'tag';
  if (normalize(doc.content).includes(nq)) return 'content';
  return null;
}

async search({ query, topK = 5 }: KBQuery): Promise<SearchResult[]> {
  return this.docs
    .map(document => ({ document, matchType: matchOf(document, query) }))
    .filter((r): r is SearchResult => r.matchType !== null)
    .sort((a, b) => SCORE[b.matchType] - SCORE[a.matchType]
                 || a.document.id.localeCompare(b.document.id))
    .slice(0, topK);
}
```

Kết quả mong đợi với seed ở mục 4:

| Query | Kết quả |
|---|---|
| `"login"` | 3 tài liệu; `doc-001` khớp title đứng đầu |
| `"dang nhap"` | `doc-001`, `matchType: "title"` |
| `"Base"` | `doc-001`, `matchType: "content"` |
| `"login"`, `topK: 1` | Chỉ `doc-001` |
| `"xyz"` | Mảng rỗng, không lỗi |

Mock và API thật chỉ cần giống nhau về **hợp đồng**, không cần giống thuật toán. Khi thấy khác biệt: viết test fail thể hiện khác biệt rồi quyết định sửa bên nào.

## 6. Edge case và cách test

### Nguyên tắc chung
1. **Validate trước khi gọi client** (lớp service/validator dùng chung) → Mock và HTTP xử lý input sai giống nhau.
2. **Input sai thì báo lỗi rõ ràng**, không trả rỗng im lặng.
3. **Kiểm chứng với API thật**; nếu server khác đề xuất, mock theo server.

### 6.1 Query rỗng và `topK` / `limit`

| Input | Đề xuất |
|---|---|
| `""`, `"   "` | `ValidationError` |
| Không truyền `topK` | Mặc định `5` |
| `topK = 0`, âm | `ValidationError` |
| `topK = 2.5`, `--top-k abc` | `ValidationError` (Commander nhận chuỗi: `Number("abc")` → `NaN`, `parseInt("2.5")` → `2`) |
| `topK` > số tài liệu khớp | Trả tất cả, không lỗi |
| `topK` cực lớn | Chặn ở mức tối đa (VD 50) hoặc báo lỗi |

Dùng chung một hàm `parsePositiveInt` cho `--top-k` và `--limit`.

```ts
it.each(['', '   '])('từ chối query rỗng %p', (q) => {
  expect(() => validateSearchQuery({ query: q })).toThrow(ValidationError);
});
it.each([0, -1, 2.5, NaN])('từ chối topK = %p', (topK) => {
  expect(() => validateSearchQuery({ query: 'login', topK })).toThrow(ValidationError);
});
it('topK lớn hơn số tài liệu khớp → trả tất cả', async () => {
  expect(await client.search({ query: 'login', topK: 100 })).toHaveLength(3);
});
```

### 6.2 `nodePath` và list đệ quy

Chuẩn hoá (áp dụng cả khi `list` lẫn `add`):

| Input | Kết quả |
|---|---|
| `/templates/email/` | `/templates/email` |
| `/templates//email` | `/templates/email` |
| `/` | `/` |
| `templates/email`, `""` | `ValidationError` |

- Hoa thường: **giữ nguyên** (như đường dẫn Linux/URL), ghi rõ vào `DECISIONS.md`.
- `list /templates`: **mặc định không đệ quy**; cờ `--recursive` để lấy cả cây con (giống `ls` / `ls -R`).
- Node không tồn tại → mảng rỗng, không lỗi.
- **Bẫy so sánh tiền tố:**

```ts
// SAI: '/templates-old/x'.startsWith('/templates') === true
doc.nodePath.startsWith(node)
// ĐÚNG
doc.nodePath === node || doc.nodePath.startsWith(node + '/')
```

```ts
it.each(['/templates/email', '/templates/email/', '/templates//email'])(
  'chuẩn hoá %p', async (node) => {
    expect((await client.list({ nodePath: node })).map(d => d.id)).toEqual(['doc-002', 'doc-003']);
  });
it('không đệ quy: /templates không lấy /templates/email', async () => {
  expect(await client.list({ nodePath: '/templates' })).toEqual([]);
});
it('không nhầm node cùng tiền tố', async () => {
  const c = new MockKBClient([...seed, makeDoc({ id: 'doc-099', nodePath: '/templates-old/email' })]);
  const docs = await c.list({ nodePath: '/templates', recursive: true });
  expect(docs.map(d => d.id)).not.toContain('doc-099');
});
```

### 6.3 `add`: trùng title và sinh `id`

- **Trùng title:** cấm trùng **trong cùng `nodePath`** (so sánh sau `normalize`); khác node thì cho phép. Khi trùng ném `DuplicateDocumentError` kèm id của tài liệu đã có.
- **Validation khác:** title/content không rỗng (file rỗng cũng tính), file không tồn tại báo lỗi rõ, `nodePath` hợp lệ, tags trim + chữ thường + bỏ trùng (`"SMS, sms ,login"` → `["sms", "login"]`).
- **Sinh id:**
  - HTTPKBClient: **server sinh id**, client dùng id trong response.
  - MockKBClient: **max hiện có + 1**, đệm 3 chữ số. Không dùng `docs.length + 1` (seed có lỗ hổng sẽ sinh trùng).

```ts
private nextId(): string {
  const max = Math.max(0, ...this.docs.map(d => Number(d.id.replace('doc-', '')) || 0));
  return `doc-${String(max + 1).padStart(3, '0')}`;
}
```

- **Bug hay gặp:** mock dùng chung mảng seed → test `add` làm bẩn test sau. Copy trong constructor, tạo client mới mỗi test:

```ts
constructor(seed: Document[] = DEFAULT_DOCS) { this.docs = structuredClone(seed); }
beforeEach(() => { client = new MockKBClient(); });
```

```ts
it('add sinh id tiếp theo và retrieve lại được', async () => {
  const doc = await client.add({ title: 'SMS login', content: '...', nodePath: '/templates/sms', tags: ['sms'] });
  expect(doc.id).toBe('doc-004');
  expect(await client.retrieve('doc-004')).toEqual(doc);
});
it('trùng title trong cùng node → DuplicateDocumentError', async () => {
  await expect(client.add({ title: 'email ack – login issue ', content: 'x', nodePath: '/templates/email', tags: [] }))
    .rejects.toThrow(DuplicateDocumentError);
});
it('add không làm thay đổi seed của client khác', async () => {
  await client.add({ title: 'T', content: 'x', nodePath: '/a', tags: [] });
  expect(await new MockKBClient().list({ nodePath: '/a' })).toEqual([]);
});
```

### 6.4 `retrieve` id không tồn tại

- Ném `DocumentNotFoundError` (nhất quán với `tickets show` tuần 2).
- HTTPKBClient chuyển **HTTP 404** thành cùng lỗi đó → CLI chỉ bắt một loại lỗi.
- CLI: in `Không tìm thấy tài liệu: doc-999`, exit code khác 0.
- `kb retrieve ""` là `ValidationError`, không phải NotFound.

```ts
it('retrieve id không tồn tại → DocumentNotFoundError', async () => {
  await expect(client.retrieve('doc-999')).rejects.toThrow(DocumentNotFoundError);
});
it('HTTP 404 → DocumentNotFoundError', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
  await expect(new HTTPKBClient('http://kb.test').retrieve('doc-999')).rejects.toThrow(DocumentNotFoundError);
});
```

### 6.5 Contract test chạy cho cả hai client

Chứng minh tiêu chí "Mock và HTTP client đều chạy đúng" bằng một bộ test dùng chung:

```ts
function kbClientContract(name: string, makeClient: () => KBClient) {
  describe(`${name} – KBClient contract`, () => {
    let client: KBClient;
    beforeEach(() => { client = makeClient(); });
    it('retrieve id không tồn tại → DocumentNotFoundError', async () => {
      await expect(client.retrieve('doc-999')).rejects.toThrow(DocumentNotFoundError);
    });
    // ... các test hành vi ở trên
  });
}

kbClientContract('MockKBClient', () => new MockKBClient());

const url = process.env.KB_API_URL;
(url ? describe : describe.skip)('HTTP', () => {
  kbClientContract('HTTPKBClient', () => new HTTPKBClient(url!));
});
```

Test xanh ở mock nhưng đỏ ở HTTP = "mock khác real" → có ngay test fail để quyết định sửa bên nào.

## 7. Câu hỏi còn mở / cần kiểm chứng

- [ ] KB API thật có trả `matchType` không? Giá trị là gì? (curl `/search`)
- [ ] API dùng keyword, semantic hay hybrid search?
- [ ] Server xử lý query rỗng, `topK` không hợp lệ, id không tồn tại thế nào (status code, body lỗi)?
- [ ] `/list` của server có đệ quy theo `nodePath` không? Có chuẩn hoá dấu `/` cuối không?
- [ ] `/add` trùng title thì server làm gì? Response trả về những trường nào?
- [ ] KB API đã có sẵn dữ liệu và node nào? (hỏi mentor — nếu có `/templates/email` thì theo cấu trúc sẵn)
- [ ] Có KB riêng để chạy test `add` không, tránh tạo dữ liệu rác trên KB thật?

---

## Nguồn tham khảo
- [Odoo Knowledge documentation](https://www.odoo.com/documentation/saas-19.4/es/applications/productivity/knowledge.html)
- [Odoo documentation – Articles management](https://github.com/odoo/documentation/commit/cf0d33e852cfdb3ee33f901f5da863823bdcbe4c)
- [Atlassian – Organize your space (Confluence Cloud)](https://support.atlassian.com/confluence-cloud/docs/organize-your-space/)
- [Docmost – How to Create and Organize Spaces in Confluence](https://docmost.com/blog/create-and-organize-spaces-in-confluence/)
- [Kolekti – Confluence page trees guide](https://www.kolekti.com/resources/blog/confluence-page-trees-guide)
- Tài liệu khoá học: `docs/plans/week-3/`, `docs/plans/week-4/scenarios/`, `docs/plans/week-5/tasks.md`
