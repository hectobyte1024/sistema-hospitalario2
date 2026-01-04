import { useState, useEffect } from 'react';
import { 
    getPatients, 
    getVitalSigns, 
    getTreatments, 
    getNurseNotes, 
    getAppointments,
    addVitalSignsDB,
    addTreatmentDB,
    addNurseNoteDB,
    updatePatientDB,
    initDatabase 
} from '../services/database';

export const initializeApp = async () => {
    return await initDatabase();
};

export function usePatients() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        try {
            const data = await getPatients();
            setPatients(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { refresh(); }, []);

    const updatePatient = async (id, data) => {
        await updatePatientDB(id, data);
        await refresh();
    };

    return { patients, updatePatient, loading, refresh };
}

export function useVitalSigns() {
    const [vitalSigns, setVitalSigns] = useState([]);
    
    const refresh = async () => {
        const data = await getVitalSigns();
        setVitalSigns(data);
    };
    
    useEffect(() => { refresh(); }, []);

    const addVitalSigns = async (data) => {
        await addVitalSignsDB(data);
        await refresh();
    };

    return { vitalSigns, addVitalSigns };
}

export function useTreatments() {
    const [treatments, setTreatments] = useState([]);
    
    const refresh = async () => {
        const data = await getTreatments();
        setTreatments(data);
    };
    
    useEffect(() => { refresh(); }, []);

    const addTreatment = async (data) => {
        await addTreatmentDB(data);
        await refresh();
    };

    return { treatments, addTreatment };
}

export function useNurseNotes() {
    const [nurseNotes, setNurseNotes] = useState([]);
    
    const refresh = async () => {
        const data = await getNurseNotes();
        setNurseNotes(data);
    };
    
    useEffect(() => { refresh(); }, []);

    const addNurseNote = async (data) => {
        await addNurseNoteDB(data);
        await refresh();
    };

    return { nurseNotes, addNurseNote };
}

export function useAppointments() {
    const [appointments, setAppointments] = useState([]);
    useEffect(() => {
        getAppointments().then(setAppointments);
    }, []);
    return { appointments };
}
