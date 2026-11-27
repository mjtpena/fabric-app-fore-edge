import { entity, int, role, text, uuid } from '@microsoft/rayfin-core';

@entity()
@role('authenticated', 'read')
@role('authenticated', 'create')
@role('authenticated', 'update')
@role('authenticated', 'delete')
export class Chapter {
  @uuid()
  id!: string;

  @uuid()
  bookId!: string;

  @int()
  number!: number;

  @text({ max: 100 })
  title!: string;

  @int()
  startPage!: number;

  @int()
  endPage!: number;
}
