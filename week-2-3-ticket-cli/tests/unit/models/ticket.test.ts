import { parseNewTicket } from '../../../src/models/ticket';
import { ValidationError } from '../../../src/errors';

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
});
