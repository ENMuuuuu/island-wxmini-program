const today = new Date().toISOString().split('T')[0];

const mockUser = {
  id: 'u1',
  nickname: '岛主',
  avatar_url: '',
  bio: '',
  birthday: '',
  created_at: '2026-04-15T00:00:00Z',
};

// Co-build partner user
const mockPartner = {
  id: 'u2',
  nickname: '共岛人',
  avatar_url: '',
  created_at: '2026-04-20T00:00:00Z',
  invite_code: 'ISLAND-2024',
};

const mockThemes = [
  {
    id: 1, name: '建筑成长', theme_type: 'building', total_layers: 30,
    preview_url: '',
    config_json: { primary_color: '#FF7B5C' },
  },
  {
    id: 2, name: '岛屿生长', theme_type: 'island', total_layers: 50,
    preview_url: '',
    config_json: { primary_color: '#3DD8C4' },
  },
  {
    id: 3, name: '星空绽放', theme_type: 'stars', total_layers: 40,
    preview_url: '',
    config_json: { primary_color: '#F5C842' },
  },
];

const mockHabits = [
  {
    id: 'h1', user_id: 'u1', name: '深度阅读 30 分钟',
    category: 'learning', description: '每天睡前阅读，拒绝刷手机',
    frequency_type: 'daily', goal_times_per_day: 1,
    theme_id: 2, theme_type: 'island',
    start_date: '2026-04-15', end_date: null,
    habit_status: 'active',
    today_record: { date: today, status: 'pending', checkin_count: 0, dark_level: 0 },
    growth_state: {
      current_layer_count: 14, lit_layer_count: 14, dark_layer_count: 0,
      progress_percent: 28, growth_status: 'growing',
    },
    schedule: { repeat_type: 'daily', remind_time: '21:00', timezone: 'Asia/Shanghai' },
    streak: 14,
  },
  {
    id: 'h2', user_id: 'u1', name: '完成 3 公里夜跑',
    category: 'fitness', description: '',
    frequency_type: 'daily', goal_times_per_day: 1,
    theme_id: 1, theme_type: 'building',
    start_date: '2026-04-03', end_date: null,
    habit_status: 'active',
    today_record: { date: today, status: 'pending', checkin_count: 0, dark_level: 0 },
    growth_state: {
      current_layer_count: 12, lit_layer_count: 12, dark_layer_count: 0,
      progress_percent: 40, growth_status: 'growing',
    },
    schedule: { repeat_type: 'daily', remind_time: '19:00', timezone: 'Asia/Shanghai' },
    streak: 12,
  },
  {
    id: 'h3', user_id: 'u1', name: '23:30 前入睡',
    category: 'health', description: '保证充足睡眠',
    frequency_type: 'daily', goal_times_per_day: 1,
    theme_id: 3, theme_type: 'stars',
    start_date: '2026-04-20', end_date: null,
    habit_status: 'active',
    today_record: { date: today, status: 'pending', checkin_count: 0, dark_level: 0 },
    growth_state: {
      current_layer_count: 8, lit_layer_count: 7, dark_layer_count: 1,
      progress_percent: 20, growth_status: 'growing',
    },
    schedule: { repeat_type: 'daily', remind_time: '23:00', timezone: 'Asia/Shanghai' },
    streak: 7,
  },
];

// Partner habits for co-build mode (partner has already done one habit today)
const mockPartnerHabits = [
  {
    id: 'ph1', user_id: 'u2', name: '冥想 10 分钟',
    theme_type: 'island', habit_status: 'active',
    today_record: { date: today, status: 'completed' },
    growth_state: { current_layer_count: 6, lit_layer_count: 6, dark_layer_count: 0 },
    streak: 6,
  },
  {
    id: 'ph2', user_id: 'u2', name: '晨间日记',
    theme_type: 'building', habit_status: 'active',
    today_record: { date: today, status: 'pending' },
    growth_state: { current_layer_count: 4, lit_layer_count: 3, dark_layer_count: 1 },
    streak: 3,
  },
];

// Local mutable state (simulates backend persistence within session)
let _habits = JSON.parse(JSON.stringify(mockHabits));
let _nextHabitId = 4;
let _cobuildActive = false;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ok(data) {
  return { code: 0, message: 'ok', data };
}

const MOCK = {
  async login(params) {
    await delay(800);
    return ok({ token: 'mock_token_' + Date.now(), user: mockUser, expires_in: 604800 });
  },

  async getMe() {
    await delay(200);
    return ok(mockUser);
  },

  async getHomeData() {
    await delay(300);
    const completed = _habits.filter(h => h.today_record.status === 'completed').length;
    return ok({
      user: mockUser,
      today_habits: JSON.parse(JSON.stringify(_habits)),
      completed_count: completed,
      pending_count: _habits.length - completed,
    });
  },

  async getThemes() {
    await delay(200);
    return ok(mockThemes);
  },

  async getHabits(params) {
    await delay(300);
    const status = params && params.status;
    const list = status ? _habits.filter(h => h.habit_status === status) : _habits;
    return ok(JSON.parse(JSON.stringify(list)));
  },

  async getHabit(id) {
    await delay(200);
    const h = _habits.find(h => h.id === id);
    if (!h) return { code: 404, message: 'not found', data: null };
    return ok(JSON.parse(JSON.stringify(h)));
  },

  async createHabit(params) {
    await delay(500);
    const theme = mockThemes.find(t => t.id === params.theme_id) || mockThemes[1];
    const newHabit = {
      id: 'h' + _nextHabitId++,
      user_id: 'u1',
      name: params.name,
      category: params.category || 'other',
      description: params.description || '',
      frequency_type: params.frequency_type || 'daily',
      goal_times_per_day: params.goal_times_per_day || 1,
      theme_id: params.theme_id || 't2',
      theme_type: theme.theme_type,
      start_date: today,
      end_date: null,
      habit_status: 'active',
      today_record: { date: today, status: 'pending', checkin_count: 0, dark_level: 0 },
      growth_state: {
        current_layer_count: 0, lit_layer_count: 0, dark_layer_count: 0,
        progress_percent: 0, growth_status: 'growing',
      },
      schedule: params.schedule || { repeat_type: 'daily', timezone: 'Asia/Shanghai' },
      streak: 0,
    };
    _habits.push(newHabit);
    return ok(JSON.parse(JSON.stringify(newHabit)));
  },

  async checkin(params) {
    await delay(400);
    const habit = _habits.find(h => h.id === params.habit_id);
    if (!habit) return { code: 404, message: 'not found', data: null };

    habit.today_record.status = 'completed';
    habit.today_record.checkin_count = 1;
    habit.streak = (habit.streak || 0) + 1;
    const newLayerNo = habit.growth_state.current_layer_count + 1;
    habit.growth_state.current_layer_count = newLayerNo;
    habit.growth_state.lit_layer_count = newLayerNo;

    const newLayer = {
      id: 'layer_' + Date.now(),
      habit_id: habit.id,
      layer_no: newLayerNo,
      theme_type: habit.theme_type,
      render_state: 'rendered',
    };

    return ok({
      checkin_id: 'c_' + Date.now(),
      day_record: { ...habit.today_record },
      new_layer: newLayer,
      growth_state: { ...habit.growth_state },
    });
  },

  // Repair one decayed block — converts dark→lit layer
  async repairLayer(habitId) {
    await delay(400);
    const habit = _habits.find(h => h.id === habitId);
    if (!habit) return { code: 404, message: 'not found', data: null };
    if (habit.growth_state.dark_layer_count <= 0) {
      return { code: 400, message: 'no dark layers to repair', data: null };
    }

    habit.growth_state.dark_layer_count--;
    habit.growth_state.lit_layer_count++;
    const repairedLayerNo = habit.growth_state.lit_layer_count;

    const repairedLayer = {
      id: 'layer_repaired_' + Date.now(),
      habit_id: habitId,
      layer_no: repairedLayerNo,
      theme_type: habit.theme_type,
      render_state: 'rendered',
    };

    return ok({
      repaired_layer: repairedLayer,
      growth_state: { ...habit.growth_state },
    });
  },

  async updateHabitStatus(id, status) {
    await delay(300);
    const habit = _habits.find(h => h.id === id);
    if (habit) habit.habit_status = status;
    return ok({ id, habit_status: status });
  },

  async getHabitCalendar(id, yearMonth) {
    await delay(300);
    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const habit = _habits.find(h => h.id === id);
    const layerCount = habit ? habit.growth_state.lit_layer_count : 0;
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isPast = dateStr < today;
      const isToday = dateStr === today;
      let status = 'skipped';
      if (isToday) {
        status = habit && habit.today_record.status === 'completed' ? 'completed' : 'pending';
      } else if (isPast && d <= layerCount) {
        status = 'completed';
      } else if (isPast) {
        status = Math.random() > 0.3 ? 'completed' : 'missed';
      }
      days.push({ date: dateStr, status, checkin_count: status === 'completed' ? 1 : 0 });
    }
    return ok({ habit_id: id, year_month: yearMonth, days });
  },

  // Returns { lit: [...], dark: [...] } for the detail page renderer
  async getGrowthLayers(habitId) {
    await delay(200);
    const habit = _habits.find(h => h.id === habitId);
    if (!habit) return ok({ lit: [], dark: [] });

    const lit = [];
    for (let i = 0; i < habit.growth_state.lit_layer_count; i++) {
      lit.push({
        id: `${habitId}_layer_${i}`,
        habit_id: habitId,
        layer_no: i + 1,
        theme_type: habit.theme_type,
        render_state: 'rendered',
      });
    }

    const dark = [];
    for (let i = 0; i < habit.growth_state.dark_layer_count; i++) {
      dark.push({
        id: `${habitId}_dark_${i}`,
        habit_id: habitId,
        layer_no: habit.growth_state.lit_layer_count + i + 1,
        theme_type: habit.theme_type,
        render_state: 'dark',
      });
    }

    return ok({ lit, dark });
  },

  // Co-build: get combined island status for both users
  async getCobuildStatus() {
    await delay(300);
    if (!_cobuildActive) return { code: 403, message: 'not in cobuild mode', data: null };

    const partnerDone = mockPartnerHabits.filter(h => h.today_record.status === 'completed').length;
    return ok({
      partner: mockPartner,
      partner_habits: JSON.parse(JSON.stringify(mockPartnerHabits)),
      partner_done_count: partnerDone,
      partner_total_count: mockPartnerHabits.length,
    });
  },

  // Co-build: join a shared island using invite code
  async joinCobuild(code) {
    await delay(600);
    if (!code || code.trim().toUpperCase() !== 'ISLAND-2024') {
      return { code: 400, message: '邀请码无效，请确认后重试', data: null };
    }
    _cobuildActive = true;
    return ok({
      partner: mockPartner,
      cobuild_id: 'cobuild_' + Date.now(),
    });
  },

  // Co-build: leave shared island
  async leaveCobuild() {
    await delay(300);
    _cobuildActive = false;
    return ok({ left: true });
  },

  async saveCheckinNote(checkinId, note) {
    await delay(200);
    return ok({ checkin_id: checkinId, note });
  },

  async updateProfile(params) {
    await delay(400);
    if (params.nickname !== undefined) mockUser.nickname = params.nickname;
    if (params.bio !== undefined)      mockUser.bio = params.bio;
    if (params.birthday !== undefined) mockUser.birthday = params.birthday;
    if (params.avatar_url !== undefined) mockUser.avatar_url = params.avatar_url;
    return ok({ ...mockUser });
  },
};

module.exports = MOCK;
