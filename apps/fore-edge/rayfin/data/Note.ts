import { date, entity, int, role, set, text, uuid } from '@microsoft/rayfin-core';

export type NoteKind = 'question' | 'insight' | 'disagreement';

@entity()
@role('authenticated', 'read')
@role('authenticated', 'create', { policy: (claims, item) => claims.sub.eq(item.authorSub) })
@role('authenticated', 'update', {
  policy: (claims, item) => claims.sub.eq(item.authorSub),
  exclude: ['authorSub', 'createdAt'],
})
@role('authenticated', 'delete', { policy: (claims, item) => claims.sub.eq(item.authorSub) })
export class Note {
  @uuid()
  id!: string;

  @uuid()
  bookId!: string;

  @int()
  chapter!: number;

  @text({ max: 60 })
  authorSub!: string;

  @text({ max: 100 })
  authorName!: string;

  @set('question', 'insight', 'disagreement')
  kind!: NoteKind;

  @text({ max: 500 })
  body!: string;

  @date()
  createdAt!: Date;
}
