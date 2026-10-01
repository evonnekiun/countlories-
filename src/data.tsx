import React, { createContext, useContext, useEffect, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Meal = { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; time: string; dateKey: string };
export type Movement = { id: string; activity: string; feeling: string; date: string };
export type Profile = { name: string; height: string; currentWeight: string; goalWeight: string; focus: string; calorieGoal: string; proteinGoal: string; carbsGoal: string; fatGoal: string; calorieTracking: boolean };
export type Data = { profile: Profile; meals: Meal[]; movement: Movement[]; circleName: string; posts: { id: string; author: string; text: string; time: string; likes: number }[]; reports: { id: string; postId: string; reason: string; details: string; time: string }[]; plans: { id: string; name: string; note: string; dateKey: string }[] };
export const DEFAULT: Data = { profile: { name: '', height: '', currentWeight: '', goalWeight: '', focus: 'Build a kind routine', calorieGoal: '2100', proteinGoal: '120', carbsGoal: '250', fatGoal: '70', calorieTracking: true }, meals: [], movement: [], circleName: 'My gym circle', posts: [], reports: [], plans: [] };
const KEY = 'goodform.v1';
const Context = createContext<{ data: Data; setData: Dispatch<SetStateAction<Data>>; ready: boolean; reset: () => Promise<void> } | null>(null);
export function DataProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<Data>(DEFAULT);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then(raw => {
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Data>;
        setData({
          ...DEFAULT,
          ...saved,
          profile: { ...DEFAULT.profile, ...saved.profile },
          meals: (saved.meals ?? []).map(meal => ({ ...meal, carbs: meal.carbs ?? 0, fat: meal.fat ?? 0, dateKey: meal.dateKey ?? 'legacy' })),
          plans: saved.plans ?? [],
        });
      }
    }).catch(() => {}).finally(() => setReady(true));
  }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {}); }, [data, ready]);
  async function reset() { await AsyncStorage.removeItem(KEY); setData(DEFAULT); }
  return <Context.Provider value={{ data, setData, ready, reset }}>{children}</Context.Provider>;
}
export function useGoodform() {
  const value = useContext(Context);
  if (!value) throw new Error('useGoodform must be used inside DataProvider');
  return value;
}
