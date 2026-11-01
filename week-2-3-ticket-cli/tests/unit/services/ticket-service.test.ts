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
});
