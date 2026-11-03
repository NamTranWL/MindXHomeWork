import type { Document } from '../../src/models/kb';

/** Fixture cố định cho test KB (SPEC §4.8). Không dùng seed mặc định để sửa seed không làm hỏng test. */
export const KB_FIXTURE: readonly Document[] = [
  {
    id: 'doc-001',
    title: 'Runbook: Xử lý lỗi đăng nhập LMS',
    nodePath: '/runbooks/login',
    tags: ['login', 'lms', 'teacher'],
    content: [
      '# Runbook: Xử lý lỗi đăng nhập LMS',
      'Workaround cho user: thử Incognito, kiểm tra đúng URL lms.mindx.edu.vn',
      '',
      '## Chẩn đoán',
      'Kiểm tra trạng thái tài khoản trên Base.',
      '',
    ].join('\n'),
  },
  {
    id: 'doc-002',
    title: 'Email ACK – Login issue',
    nodePath: '/templates/email',
    tags: ['login', 'ack'],
    content: 'Chào {name},\nTeam đã nhận yêu cầu {ticketId} và đang kiểm tra.\n',
  },
  {
    id: 'doc-003',
    title: 'Email resolution – Đã reset mật khẩu',
    nodePath: '/templates/email',
    tags: ['login', 'resolution'],
    content: 'Chào {name},\nMật khẩu của bạn đã được đặt lại. Vui lòng đăng nhập lại tại lms.mindx.edu.vn.\n',
  },
  {
    id: 'doc-004',
    title: 'DevOps on-call',
    nodePath: '/team/devops',
    tags: ['team', 'devops', 'on-call'],
    content: 'Trực chính: SRE. Dự phòng: DevOps Lead.\nKênh Teams: #devops-oncall',
  },
];
