import { useEffect } from 'react';
import { Command } from 'cmdk';
import { useEngine } from '../context/EngineContext';
import { Zap, Route, Bed, Pill, Truck, RotateCcw, Bomb, Search, Activity, Map, Beaker, Building2, Users, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { generateEmergency, generateBurst, blockRandomRoad, reopenRandomRoad, fillRandomBeds, depleteRandomMedicine, occupyAmbulance, freeAmbulance, resetSimulation, runBenchmark } = useEngine();
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-start justify-center pt-[20vh] bg-[#0F172A]/40 backdrop-blur-[2px]">
      <Command className="w-[600px] overflow-hidden rounded-[16px] border border-[#E2E8F0] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
        <div className="flex items-center gap-3 border-b border-[#E2E8F0] px-4">
          <Search className="h-4 w-4 text-[#94A3B8]" />
          <Command.Input placeholder="Search hospitals, ambulances, patients, actions..." className="h-[48px] w-full bg-transparent font-sans text-[14px] text-[#0F172A] outline-none placeholder:text-[#94A3B8]" autoFocus />
        </div>
        <Command.List className="max-h-[380px] overflow-y-auto p-2">
          <Command.Empty className="p-8 text-center font-sans text-[13px] text-[#64748B]">No results found</Command.Empty>

          <Command.Group heading="Navigate" className="px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-[#94A3B8]">
            <Command.Item onSelect={() => { navigate('/'); onOpenChange(false); }} className="mt-1 flex items-center gap-3 rounded-[8px] px-3 py-2.5 font-sans text-[13px] text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] data-[selected=true]:bg-[#F1F5F9] data-[selected=true]:text-[#0F172A]"><Activity className="h-4 w-4" /> Dashboard</Command.Item>
            <Command.Item onSelect={() => { navigate('/live'); onOpenChange(false); }} className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 font-sans text-[13px] text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] data-[selected=true]:bg-[#F1F5F9]"><Radio className="h-4 w-4 text-[#DC2626]" /> Live Tracker</Command.Item>
            <Command.Item onSelect={() => { navigate('/hospitals'); onOpenChange(false); }} className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 font-sans text-[13px] text-[#475569] hover:bg-[#F8FAFC] data-[selected=true]:bg-[#F1F5F9]"><Building2 className="h-4 w-4" /> Hospitals</Command.Item>
            <Command.Item onSelect={() => { navigate('/fleet'); onOpenChange(false); }} className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 font-sans text-[13px] text-[#475569] hover:bg-[#F8FAFC] data-[selected=true]:bg-[#F1F5F9]"><Truck className="h-4 w-4" /> Fleet</Command.Item>
            <Command.Item onSelect={() => { navigate('/patients'); onOpenChange(false); }} className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 font-sans text-[13px] text-[#475569] hover:bg-[#F8FAFC] data-[selected=true]:bg-[#F1F5F9]"><Users className="h-4 w-4" /> Patients</Command.Item>
          </Command.Group>

          <Command.Group heading="Emergency Actions" className="px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-[#94A3B8]">
            <Command.Item onSelect={() => { generateEmergency('CRITICAL'); onOpenChange(false); }} className="mt-1 flex items-center gap-3 rounded-[8px] px-3 py-2.5 font-sans text-[13px] text-[#475569] hover:bg-[#F8FAFC] data-[selected=true]:bg-[#F1F5F9]"><Zap className="h-4 w-4 text-[#DC2626]" /> Generate Critical Emergency</Command.Item>
            <Command.Item onSelect={() => { generateBurst(5); onOpenChange(false); }} className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 font-sans text-[13px] text-[#475569] hover:bg-[#F8FAFC] data-[selected=true]:bg-[#F1F5F9]"><Bomb className="h-4 w-4" /> Burst x5 Concurrent</Command.Item>
          </Command.Group>

          <Command.Group heading="Simulation" className="px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-[#94A3B8]">
            <Command.Item onSelect={() => { blockRandomRoad(); onOpenChange(false); }} className="mt-1 flex items-center gap-3 rounded-[8px] px-3 py-2.5 font-sans text-[13px] text-[#475569] hover:bg-[#F8FAFC] data-[selected=true]:bg-[#F1F5F9]"><Route className="h-4 w-4" /> Block Road</Command.Item>
            <Command.Item onSelect={() => { fillRandomBeds(); onOpenChange(false); }} className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 font-sans text-[13px] text-[#475569] hover:bg-[#F8FAFC] data-[selected=true]:bg-[#F1F5F9]"><Bed className="h-4 w-4" /> Fill Beds</Command.Item>
            <Command.Item onSelect={() => { runBenchmark(1000); onOpenChange(false); }} className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 font-sans text-[13px] text-[#475569] hover:bg-[#F8FAFC] data-[selected=true]:bg-[#F1F5F9]"><Beaker className="h-4 w-4 text-[#0E9F6E]" /> Run Benchmark</Command.Item>
          </Command.Group>
        </Command.List>
        <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 font-mono text-[10px] text-[#64748B] flex items-center justify-between">
          <span>Press ⌘K to toggle · P for presentation · ESC to close</span>
          <span className="font-medium text-[#0F172A]">RouMi v1.0</span>
        </div>
      </Command>
    </div>
  );
}
