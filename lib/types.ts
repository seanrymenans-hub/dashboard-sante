export type DataStatus = 'good_data' | 'partial_data' | 'insufficient_data' | 'not_available'

export interface WeightEntry { id?: string | number; date: string; valeur: number }
export interface MealEntry { id?: string | number; date: string; type?: string; nom?: string; kcal?: number; proteines?: number; glucides?: number; lipides?: number }
export interface WorkoutEntry { id?: string | number; date: string; type?: string; nom?: string; kcal?: number; duree?: number; distance?: number | string; allure?: number | string }
export interface CompositionEntry { id?: string | number; date: string; masse_grasse?: number; masse_grasse_pct?: number; masse_musculaire?: number; masse_musculaire_pct?: number; masse_hydrique?: number; masse_hydrique_pct?: number; masse_maigre?: number; masse_osseuse?: number }
export interface StepsEntry { id?: string | number; date: string; nb_pas?: number; calories_pas?: number; distance_m?: number; source?: string }
export interface HydrationEntry { id?: string | number; date: string; verres?: number }
export interface DailyBudgetEntry { date: string; budget_jour?: number; tmb?: number; kcal_pas?: number; kcal_sport?: number; tef?: number; deficit_cible?: number }
export interface Goals { tmb?: number; deficit_cible?: number; poids_objectif?: number; poids_depart?: number; objectif_pas?: number; objectif_seances_semaine?: number; [key: string]: unknown }
