import { date, entity, int, role, text, uuid } from '@microsoft/rayfin-core';

@entity()
@role('authenticated', 'read')
@role('authenticated', 'create', { policy: (claims, item) => claims.sub.eq(item.readerSub) })
@role('authenticated', 'update', {
  policy: (claims, item) => claims.sub.eq(item.readerSub),
  exclude: ['readerSub'],
})
@role('authenticated', 'delete', { policy: (claims, item) => claims.sub.eq(item.readerSub) })
export class Progress {
  @uuid()
  id!: string;

  @uuid()
  bookId!: string;

  @text({ max: 60 })
  readerSub!: string;

  @date()
  on!: Date;

  @int()
  page!: number;

  @int()
  minutes!: number;
}
