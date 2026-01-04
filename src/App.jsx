import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, FileText, Activity, Users, Pill, 
  LogOut, Heart, Stethoscope, AlertCircle, CheckCircle, 
  Menu, X, LayoutDashboard, Syringe, ClipboardList, ChevronRight, 
  Save, Building2, LineChart as ChartIcon, UserCircle 
} from 'lucide-react';
import { 
  usePatients, useAppointments, useTreatments, useVitalSigns, useNurseNotes, initializeApp 
} from './hooks/useDatabase';
import LoginForm from './components/LoginForm';
import ReportsAnalytics from './components/ReportsAnalytics';
import UserProfile from './components/UserProfile';

// --- COMPONENTES UI REUTILIZABLES ---

const StatCard = ({ title, value, icon: Icon, colorName, subtext }) => {
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100' },
  };
  const theme = colors[colorName] || colors.blue;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-hospital-200 flex items-start justify-between transition-all hover:shadow-md animate-fadeIn">
      <div>
        <p className="text-hospital-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-black text-hospital-800 mt-2">{value}</h3>
        {subtext && <p className="text-xs text-hospital-500
