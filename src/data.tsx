import React, { createContext, useContext, useEffect, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

export type NutritionFields = { calories: boolean; protein: boolean; carbs: boolean; fat: boolean };
export type Meal = { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; nutritionFields?: NutritionFields; nutritionRecorded?: boolean; time: string; dateKey: string };
export type Movement = { id: string; activity: string; feeling: string; date: string; dateKey: string };
export type Profile = { name: string; height: string; currentWeight: string; goalWeight: string; focus: string; calorieGoal: string; proteinGoal: string; carbsGoal: string; fatGoal: string; calorieTracking: boolean; macroTracking: boolean; remindersEnabled: boolean; reminderTime: string };
export type Data = { profile: Profile; meals: Meal[]; movement: Movement[]; circleName: string; posts: { id: string; author: string; text: string; time: string; likes: number }[]; reports: { id: string; postId: string; reason: string; details: string; time: string }[]; plans: { id: string; name: string; note: string; dateKey: string }[] };
export const DEFAULT: Data = { profile: { name: '', height: '', currentWeight: '', goalWeight: '', focus: 'Build a kind routine', calorieGoal: '', proteinGoal: '', carbsGoal: '', fatGoal: '', calorieTracking: false, macroTracking: false, remindersEnabled: false, reminderTime: '12:30' }, meals: [], movement: [], circleName: 'My gym circle', posts: [], reports: [], plans: [] };

type ContextValue = {
  data: Data;
  setData: Dispatch<SetStateAction<Data>>;
  ready: boolean;
  authReady: boolean;
  profileSaved: boolean;
  session: Session | null;
  loadError: string;
  reload: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  saveMeal: (meal: Meal) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  saveMovement: (item: Movement) => Promise<void>;
  savePlan: (item: Data['plans'][number]) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  clearLocalCache: () => Promise<void>;
};

const Context = createContext<ContextValue | null>(null);
const cacheKey = (userId: string) => `goodform.user.${userId}`;
const numberOrNull = (value: string) => value.trim() ? Number(value) : null;
const localDayKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};
const timeLabel = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dateLabel = (value: string) => new Date(value).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const throwIfError = (error: { message: string } | null) => { if (error) throw new Error(error.message); };

function mapProfile(row: any): Profile {
  return {
    ...DEFAULT.profile,
    name: row.display_name ?? '',
    height: row.height_cm == null ? '' : String(row.height_cm),
    currentWeight: row.current_weight_kg == null ? '' : String(row.current_weight_kg),
    goalWeight: row.goal_weight_kg == null ? '' : String(row.goal_weight_kg),
    focus: row.focus ?? DEFAULT.profile.focus,
    calorieGoal: row.calorie_goal == null ? '' : String(row.calorie_goal),
    proteinGoal: row.protein_goal_g == null ? '' : String(row.protein_goal_g),
    carbsGoal: row.carbs_goal_g == null ? '' : String(row.carbs_goal_g),
    fatGoal: row.fat_goal_g == null ? '' : String(row.fat_goal_g),
    calorieTracking: row.calorie_tracking ?? false,
    macroTracking: row.macro_tracking ?? false,
    remindersEnabled: row.reminders_enabled ?? false,
    reminderTime: row.reminder_time ?? '12:30',
  };
}

function mapMeal(row: any): Meal {
  const eatenAt = row.eaten_at;
  return {
    id: row.id,
    name: row.food_name,
    calories: Number(row.calories ?? 0),
    protein: Number(row.protein_g ?? 0),
    carbs: Number(row.carbs_g ?? 0),
    fat: Number(row.fat_g ?? 0),
    nutritionFields: { calories: row.calories != null, protein: row.protein_g != null, carbs: row.carbs_g != null, fat: row.fat_g != null },
    dateKey: localDayKey(eatenAt),
    time: timeLabel(eatenAt),
  };
}

function mapMovement(row: any): Movement {
  return { id: row.id, activity: row.activity, feeling: row.feeling ?? '', dateKey: localDayKey(row.moved_at), date: dateLabel(row.moved_at) };
}

function mapPlan(row: any): Data['plans'][number] {
  return { id: row.id, name: row.meal_name, note: row.notes ?? '', dateKey: row.planned_for };
}

export function DataProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<Data>(DEFAULT);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [cacheUserId, setCacheUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });
    supabase.auth.getSession().then(({ data: result, error }) => {
      if (!mounted) return;
      if (error) setLoadError(error.message);
      setSession(result.session);
      setAuthReady(true);
    }).catch(error => {
      if (mounted) { setLoadError(error instanceof Error ? error.message : 'Could not restore your session.'); setAuthReady(true); }
    });
    return () => { mounted = false; authListener.subscription.unsubscribe(); };
  }, []);

  const reload = async () => {
    if (!session?.user.id) return;
    setReady(false);
    setLoadError('');
    try {
      const userId = session.user.id;
      const [profileResult, mealsResult, movementResult, plansResult, cacheRaw] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('food_entries').select('*').eq('user_id', userId).order('eaten_at', { ascending: false }),
        supabase.from('movement_entries').select('*').eq('user_id', userId).order('moved_at', { ascending: false }),
        supabase.from('meal_plans').select('*').eq('user_id', userId).order('planned_for', { ascending: true }),
        AsyncStorage.getItem(cacheKey(userId)),
      ]);
      throwIfError(profileResult.error);
      throwIfError(mealsResult.error);
      throwIfError(movementResult.error);
      throwIfError(plansResult.error);
      let privateCache: Partial<Data> = {};
      try { if (cacheRaw) privateCache = JSON.parse(cacheRaw) as Partial<Data>; } catch { /* Ignore a damaged local cache. */ }
      setData({
        ...DEFAULT,
        ...privateCache,
        profile: profileResult.data ? mapProfile(profileResult.data) : { ...DEFAULT.profile, name: String(session.user.user_metadata?.display_name ?? '') },
        meals: (mealsResult.data ?? []).map(mapMeal),
        movement: (movementResult.data ?? []).map(mapMovement),
        plans: (plansResult.data ?? []).map(mapPlan),
        posts: privateCache.posts ?? [],
        reports: privateCache.reports ?? [],
        circleName: privateCache.circleName ?? DEFAULT.circleName,
      });
      setProfileSaved(Boolean(profileResult.data));
      setCacheUserId(userId);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load your Supabase data.');
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    if (!authReady) return;
    if (!session?.user.id) {
      // Clear account-scoped state when the auth session changes to signed out.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCacheUserId(null);
      setProfileSaved(false);
      setData(DEFAULT);
      setReady(true);
      setLoadError('');
      return;
    }
    setCacheUserId(null);
    setProfileSaved(false);
    setData(DEFAULT);
    void reload();
  // Reload only when the authenticated account changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, session?.user.id]);

  useEffect(() => {
    if (ready && session?.user.id && cacheUserId === session.user.id) AsyncStorage.setItem(cacheKey(session.user.id), JSON.stringify(data)).catch(() => {});
  }, [data, ready, session?.user.id, cacheUserId]);

  async function signUp(email: string, password: string, displayName: string) {
    const { data: result, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: Linking.createURL('auth/callback'),
      },
    });
    throwIfError(error);
    return !result.session;
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    throwIfError(error);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    throwIfError(error);
  }

  function requireUser() {
    if (!session?.user.id) throw new Error('Please sign in again to save your changes.');
    return session.user.id;
  }

  async function saveProfile(profile: Profile) {
    const id = requireUser();
    const row = {
      id,
      display_name: profile.name,
      height_cm: numberOrNull(profile.height),
      current_weight_kg: numberOrNull(profile.currentWeight),
      goal_weight_kg: numberOrNull(profile.goalWeight),
      calorie_goal: numberOrNull(profile.calorieGoal),
      protein_goal_g: numberOrNull(profile.proteinGoal),
      carbs_goal_g: numberOrNull(profile.carbsGoal),
      fat_goal_g: numberOrNull(profile.fatGoal),
      focus: profile.focus,
      calorie_tracking: profile.calorieTracking,
      macro_tracking: profile.macroTracking,
      reminders_enabled: profile.remindersEnabled,
      reminder_time: profile.reminderTime,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
    throwIfError(error);
    setData(current => ({ ...current, profile }));
    setProfileSaved(true);
  }

  async function saveMeal(meal: Meal) {
    const userId = requireUser();
    const now = new Date();
    const { error } = await supabase.from('food_entries').insert({
      id: meal.id,
      user_id: userId,
      eaten_at: now.toISOString(),
      food_name: meal.name,
      calories: meal.nutritionFields?.calories ? meal.calories : null,
      protein_g: meal.nutritionFields?.protein ? meal.protein : null,
      carbs_g: meal.nutritionFields?.carbs ? meal.carbs : null,
      fat_g: meal.nutritionFields?.fat ? meal.fat : null,
      source: 'manual',
    });
    throwIfError(error);
    setData(current => ({ ...current, meals: [{ ...meal, dateKey: localDayKey(now), time: timeLabel(now.toISOString()) }, ...current.meals] }));
  }

  async function deleteMeal(id: string) {
    const userId = requireUser();
    const { error } = await supabase.from('food_entries').delete().eq('id', id).eq('user_id', userId);
    throwIfError(error);
    setData(current => ({ ...current, meals: current.meals.filter(meal => meal.id !== id) }));
  }

  async function saveMovement(item: Movement) {
    const userId = requireUser();
    const movedAt = new Date(`${item.dateKey}T12:00:00`).toISOString();
    const { error } = await supabase.from('movement_entries').insert({ id: item.id, user_id: userId, moved_at: movedAt, activity: item.activity, feeling: item.feeling });
    throwIfError(error);
    setData(current => ({ ...current, movement: [item, ...current.movement] }));
  }

  async function savePlan(item: Data['plans'][number]) {
    const userId = requireUser();
    const { error } = await supabase.from('meal_plans').insert({ id: item.id, user_id: userId, planned_for: item.dateKey, meal_name: item.name, notes: item.note });
    throwIfError(error);
    setData(current => ({ ...current, plans: [...current.plans, item] }));
  }

  async function deletePlan(id: string) {
    const userId = requireUser();
    const { error } = await supabase.from('meal_plans').delete().eq('id', id).eq('user_id', userId);
    throwIfError(error);
    setData(current => ({ ...current, plans: current.plans.filter(plan => plan.id !== id) }));
  }

  async function clearLocalCache() {
    if (session?.user.id) await AsyncStorage.removeItem(cacheKey(session.user.id));
    setData(current => ({ ...current, posts: [], reports: [], circleName: DEFAULT.circleName }));
  }

  return <Context.Provider value={{ data, setData, ready, authReady, profileSaved, session, loadError, reload, signUp, signIn, signOut, saveProfile, saveMeal, deleteMeal, saveMovement, savePlan, deletePlan, clearLocalCache }}>{children}</Context.Provider>;
}

export function useGoodform() {
  const value = useContext(Context);
  if (!value) throw new Error('useGoodform must be used inside DataProvider');
  return value;
}
