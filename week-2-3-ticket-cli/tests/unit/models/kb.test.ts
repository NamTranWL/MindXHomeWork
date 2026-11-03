import { ValidationError } from '../../../src/errors';
import { normalize, normalizeNodePath, parsePositiveInt, resolveTitle } from '../../../src/models/kb';
import { expectError } from '../../helpers/kb';

describe('KB model - chuẩn hoá', () => {
  it('T65: normalize bỏ khoảng trắng hai đầu, về chữ thường, bỏ dấu và đổi đ thành d', () => {
    expect(normalize('  Đăng NHẬP ')).toBe('dang nhap');
  });

  it('T66: normalizeNodePath gộp //, bỏ / cuối, trim; giữ / gốc và giữ hoa thường', () => {
    expect(normalizeNodePath('/templates/email/')).toBe('/templates/email');
    expect(normalizeNodePath('/templates//email')).toBe('/templates/email');
    expect(normalizeNodePath(' /templates/email ')).toBe('/templates/email');
    expect(normalizeNodePath('/')).toBe('/');
    expect(normalizeNodePath('/Templates')).toBe('/Templates');
  });

  it('T67: normalizeNodePath rỗng hoặc không bắt đầu bằng / → ValidationError', async () => {
    await expectError(
      () => normalizeNodePath(''),
      ValidationError,
      'invalid node path "". Expected a path starting with "/"',
    );
    await expectError(
      () => normalizeNodePath('templates/email'),
      ValidationError,
      'invalid node path "templates/email". Expected a path starting with "/"',
    );
  });
});

describe('KB model - parsePositiveInt', () => {
  it('T68: mặc định khi không truyền, nhận số nguyên trong khoảng, báo lỗi đúng message khi sai', async () => {
    expect(parsePositiveInt(undefined, '--top-k', 50, 5)).toBe(5);
    expect(parsePositiveInt('3', '--top-k', 50, 5)).toBe(3);
    expect(parsePositiveInt('50', '--top-k', 50, 5)).toBe(50);
    expect(parsePositiveInt('100', '--limit', 100, 10)).toBe(100);

    for (const bad of ['0', '-1', '2.5', 'abc', '1e2', '51']) {
      await expectError(
        () => parsePositiveInt(bad, '--top-k', 50, 5),
        ValidationError,
        `invalid --top-k "${bad}". Expected an integer from 1 to 50`,
      );
    }
    await expectError(
      () => parsePositiveInt('101', '--limit', 100, 10),
      ValidationError,
      'invalid --limit "101". Expected an integer from 1 to 100',
    );
  });
});

describe('KB model - resolveTitle', () => {
  it('T69: --title thắng heading; không có thì lấy dòng "# ..." đầu tiên; không có heading thì lấy tên file bỏ đuôi', () => {
    const content = 'Mở đầu\n#  Tiêu đề trong file  \n# Heading thứ hai\n';

    expect(resolveTitle({ title: '  Tiêu đề tay ', content, file: '/tmp/a.md' })).toBe('Tiêu đề tay');
    expect(resolveTitle({ content, file: '/tmp/a.md' })).toBe('Tiêu đề trong file');
    expect(resolveTitle({ content: 'Không có heading\n## Cấp hai không tính\n', file: '/tmp/sms-bao-tri.md' })).toBe(
      'sms-bao-tri',
    );
  });
});
