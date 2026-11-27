import { date, entity, role, set, text, uuid } from '@microsoft/rayfin-core';

export type MembershipStatus = 'reading' | 'paused' | 'finished' | 'dropped';

@entity()
@role('authenticated', 'read')
@role('authenticated', 'create', { policy: (claims, item) => claims.sub.eq(item.readerSub) })
@role('authenticated', 'update', {
  policy: (claims, item) => claims.sub.eq(item.readerSub),
  exclude: ['readerSub'],
})
@role('authenticated', 'delete', { policy: (claims, item) => claims.sub.eq(item.readerSub) })
export class Membership {
  @uuid()
  id!: string;

  @uuid()
  bookId!: string;

  @text({ max: 60 })
  readerSub!: string;

  @text({ max: 100 })
  readerName!: string;

  @set('reading', 'paused', 'finished', 'dropped')
  status!: MembershipStatus;

  @date()
  joinedOn!: Date;
}
