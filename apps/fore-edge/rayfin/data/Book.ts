import { date, entity, int, role, set, text, uuid } from '@microsoft/rayfin-core';

export type BookStatus = 'planned' | 'reading' | 'finished';

@entity()
@role('authenticated', 'read')
@role('authenticated', 'create', { policy: (claims, item) => claims.sub.eq(item.convenorSub) })
@role('authenticated', 'update', {
  policy: (claims, item) => claims.sub.eq(item.convenorSub),
  exclude: ['convenorSub'],
})
@role('authenticated', 'delete', { policy: (claims, item) => claims.sub.eq(item.convenorSub) })
export class Book {
  @uuid()
  id!: string;

  @text({ min: 3, max: 100 })
  title!: string;

  @text({ max: 80 })
  author!: string;

  @int()
  totalPages!: number;

  @date()
  startsOn!: Date;

  @set('planned', 'reading', 'finished')
  status!: BookStatus;

  @text({ max: 60 })
  convenorSub!: string;
}
