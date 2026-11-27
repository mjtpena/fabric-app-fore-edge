import type { DemoScript } from '@x10/shared/demo';

export const script: DemoScript = {
  appId: 'fore-edge',
  title: 'Fore-Edge — Reading & Study Circle',
  scenes: [
    {
      id: 'step-1',
      say: ['A winter reading circle gathers around one thick hardback, seen from its gilt fore-edge.'],
      run: async (h) => {
        await h.goto('/');
      },
    },
    {
      id: 'step-2',
      say: ['Each silk ribbon marks where a reader sits in the book, tinted by whether they are ahead, on pace, or behind.'],
      run: async (h) => {
      },
    },
    {
      id: 'step-3',
      say: ['Pages past the fog line fall into shade, showing the spoiler-safe horizon of the slowest active reader.'],
      run: async (h) => {
      },
    },
    {
      id: 'step-4',
      say: ['Switching to the Pace lens overlays today’s expected page band and each reader’s catch-up time.'],
      run: async (h) => {
        const page = h.page;
        await h.click(page.getByRole('radiogroup', { name: 'Lens' }).getByRole('radio', { name: /Pace/ }));
      },
    },
    {
      id: 'step-5',
      say: ['The Notes lens highlights open margin slips and sealed flaps for chapters not yet reached.'],
      run: async (h) => {
        const page = h.page;
        await h.click(page.getByRole('radiogroup', { name: 'Lens' }).getByRole('radio', { name: /Notes/ }));
      },
    },
    {
      id: 'step-6',
      say: ['The Today panel focuses the next meeting flag and shows how many effective days remain.'],
      run: async (h) => {
        const page = h.page;
        await h.click(page.getByRole('button', { name: /Next meeting/ }));
      },
    },
    {
      id: 'step-7',
      say: ['Toggling View As switches between the convenor overview and a reader’s spoiler-locked perspective.'],
      run: async (h) => {
        const page = h.page;
        await h.click(page.getByRole('radio', { name: 'Reader' }));
      },
    },
    {
      id: 'step-8',
      say: ['In Bookmark, a reader logs their current page and reading minutes to slide their ribbon deeper.'],
      run: async (h) => {
        await h.goto('/bookmark');
      },
    },
    {
      id: 'step-9',
      say: ['Progress is saved immediately, and backwards entries are refused unless they are a same-day correction.'],
      run: async (h) => {
        const page = h.page;
        await h.fill(page.getByLabel('Page reached'), '258');
        await h.fill(page.getByLabel('Minutes read'), '40');
        await h.click(page.getByRole('button', { name: 'Log bookmark' }));
      },
    },
    {
      id: 'step-10',
      say: ['In Margin, notes from later chapters stay sealed until your bookmark passes their starting page.'],
      run: async (h) => {
        await h.goto('/margin');
      },
    },
    {
      id: 'step-11',
      say: ['Reading Plan gives the convenor effective-day pacing with half-weight weekends and a readiness forecast.'],
      run: async (h) => {
        await h.goto('/plan');
      },
    },
    {
      id: 'step-12',
      say: ['Meeting Pack compiles printable discussion questions and shows who will be ready on time.'],
      run: async (h) => {
        await h.goto('/pack');
      },
    },
    {
      id: 'step-13',
      say: ['Every reader moves at their own pace, while the circle stays together without spoilers.'],
      run: async (h) => {
        await h.goto('/');
      },
    },
    {
      id: 'step-14',
      say: ['Fore-Edge — built on Microsoft Fabric Apps.'],
      run: async (h) => {
      },
    },
  ],
};
