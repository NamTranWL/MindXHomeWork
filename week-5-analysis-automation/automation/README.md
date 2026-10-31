# Login Issue Automation

```
Odoo (ticket mới) ──webhook/poll──▶ Ticket Analysis ──▶ HR Check ──▶ Decision
                                                                   ├─ Active     → Reactivate LMS → Email user
                                                                   └─ Terminated → Note ticket (review tay)
                                         (mọi bước) ──▶ Logging
```

## Cấu hình
Sao chép `.env.example` thành `.env` (không commit `.env`).
