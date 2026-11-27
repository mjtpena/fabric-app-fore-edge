import { date, entity, int, role, text, uuid } from '@microsoft/rayfin-core';

@entity()
@role('authenticated', 'read')
@role('authenticated', 'create')
@role('authenticated', 'update')
@role('authenticated', 'delete')
export class Meeting {
  @uuid()
  id!: string;

  @uuid()
  bookId!: string;

  @date()
  on!: Date;

  @int()
  endChapter!: number;

  @text({ max: 100, optional: true })
  topic?: string;
}
