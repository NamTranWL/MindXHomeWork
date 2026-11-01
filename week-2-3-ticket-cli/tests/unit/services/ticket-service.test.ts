import { TicketService } from '../../../src/services/ticket-service';
import { ValidationError } from '../../../src/errors';
import { InMemoryTicketRepository, ticket } from '../../helpers/in-memory-repository';

describe('TicketService.create', () => {
  it('T13: danh sách rỗng → id = 1, ticket đủ 6 field và được lưu', async () => {
    const repo = new InMemoryTicketRepository();

    const created = await new TicketService(repo).create({ title: 'Login lỗi 500' });

    const expected = {
      id: 1,
      title: 'Login lỗi 500',
      description: '',
      status: 'open',
      priority: 'medium',
      tags: [],
    };
    expect(created).toEqual(expected);
    expect(repo.saves).toEqual([[expected]]);
  });

  it('T14: đã có ticket → id = max(id) + 1', async () => {
    const repo = new InMemoryTicketRepository([ticket({ id: 1 }), ticket({ id: 5 }), ticket({ id: 3 })]);

    const created = await new TicketService(repo).create({ title: 'x' });

    expect(created.id).toBe(6);
  });

  it('T15: input không hợp lệ → ValidationError, không đọc và không ghi', async () => {
    const repo = new InMemoryTicketRepository();

    await expect(new TicketService(repo).create({ title: '   ' })).rejects.toThrow(ValidationError);
    expect(repo.loadCalls).toBe(0);
    expect(repo.saves).toEqual([]);
  });
});

describe('TicketService.list', () => {
  const tickets = [
    ticket({ id: 3, status: 'closed', priority: 'high', tags: ['lms'] }),
    ticket({ id: 1, status: 'open', priority: 'high', tags: ['lms', 'login'] }),
    ticket({ id: 2, status: 'open', priority: 'low', tags: ['login'] }),
    ticket({ id: 4, status: 'in-progress', priority: 'medium', tags: [] }),
  ];
  const service = () => new TicketService(new InMemoryTicketRepository(tickets));
  const ids = (list: { id: number }[]) => list.map((t) => t.id);

  it('T16: không filter → tất cả ticket, theo id tăng dần', async () => {
    expect(ids(await service().list())).toEqual([1, 2, 3, 4]);
  });

  it('T17: lọc theo status', async () => {
    expect(ids(await service().list({ status: 'open' }))).toEqual([1, 2]);
  });

  it('T18: lọc theo priority', async () => {
    expect(ids(await service().list({ priority: 'high' }))).toEqual([1, 3]);
  });

  it('T19: lọc kết hợp status + priority (AND)', async () => {
    expect(ids(await service().list({ status: 'open', priority: 'high' }))).toEqual([1]);
  });

  it('T20: lọc theo một tag', async () => {
    expect(ids(await service().list({ tags: ['login'] }))).toEqual([1, 2]);
  });
});
