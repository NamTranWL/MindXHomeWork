import { parseNewTicket } from '../../../src/models/ticket';
import { ValidationError } from '../../../src/errors';
import { normalizeTags } from '../../../src/models/ticket';
import { parseTicketId } from '../../../src/models/ticket';

describe('parseNewTicket - validate và chuẩn hoá input tạo ticket', () => {
  it('T1: thiếu title → ValidationError "--title is required"', () => {
    const act = () => parseNewTicket({});

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(/^--title is required$/);
  });

  it('T2: title chỉ có khoảng trắng → ValidationError như T1', () => {
    const act = () => parseNewTicket({ title: '   ' });

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(/^--title is required$/);
  });

  it('T3: title được trim hai đầu', () => {
    expect(parseNewTicket({ title: '  Login lỗi 500  ' }).title).toBe('Login lỗi 500');
  });

  it('T4: không truyền status → "open"', () => {
    expect(parseNewTicket({ title: 'x' }).status).toBe('open');
  });

  it('T5: status ngoài open | in-progress | closed → ValidationError liệt kê giá trị hợp lệ', () => {
    const act = () => parseNewTicket({ title: 'x', status: 'done' });

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(/^invalid status "done"\. Allowed: open, in-progress, closed$/);
  });

  it('T5b: status hợp lệ (in-progress) được giữ nguyên', () => {
    expect(parseNewTicket({ title: 'x', status: 'in-progress' }).status).toBe('in-progress');
  });

  it('T6: không truyền priority → "medium"', () => {
    expect(parseNewTicket({ title: 'x' }).priority).toBe('medium');
  });

  it('T7: priority ngoài low | medium | high → ValidationError', () => {
    const act = () => parseNewTicket({ title: 'x', priority: 'urgent' });

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(/^invalid priority "urgent"\. Allowed: low, medium, high$/);
  });

  it('T7b: priority hợp lệ (high) được giữ nguyên', () => {
    expect(parseNewTicket({ title: 'x', priority: 'high' }).priority).toBe('high');
  });

  it('T8: không truyền description → ""', () => {
    expect(parseNewTicket({ title: 'x' }).description).toBe('');
  });

  it('T8b: có description → giữ nguyên, không trim', () => {
    expect(parseNewTicket({ title: 'x', description: '  mô tả  ' }).description).toBe('  mô tả  ');
  });

  it('T9: không truyền tags → []', () => {
    expect(parseNewTicket({ title: 'x' }).tags).toEqual([]);
  });
});

describe('normalizeTags - chuẩn hoá danh sách tag', () => {
  it('T10: trim, lowercase, bỏ rỗng, bỏ trùng, giữ thứ tự xuất hiện đầu tiên', () => {
    expect(normalizeTags([' LMS ', 'login', '', '  ', 'lms', 'Bug'])).toEqual(['lms', 'login', 'bug']);
  });

  it('T11: tách chuỗi theo dấu phẩy: "a, B,a" → ["a","b"]', () => {
    expect(normalizeTags(['a, B,a'])).toEqual(['a', 'b']);
  });
});

describe('parseTicketId - validate id nhập từ dòng lệnh', () => {
  const exactly = (message: string) =>
    new RegExp('^' + message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');

  it('T12: số nguyên dương → trả về number', () => {
    expect(parseTicketId('1')).toBe(1);
    expect(parseTicketId('42')).toBe(42);
  });

  it.each(['abc', '0', '-1', '1.5', '01'])('T12: "%s" → ValidationError', (raw) => {
    const act = () => parseTicketId(raw);

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(exactly(`invalid id "${raw}". Expected a positive integer`));
  });
});
