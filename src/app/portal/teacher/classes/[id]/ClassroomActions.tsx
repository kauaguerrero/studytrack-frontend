'use client'

import { useState } from "react";
import { PlusCircle, Target } from "lucide-react";
import { CreateActivityModal } from "@/components/modals/CreateActivityModal";
import { CreateGoalModal } from "@/components/modals/CreateGoalModal";

interface ActionsProps {
    classroomId: string;
    classroomName: string;
}

export function ClassroomActions({ classroomId, classroomName }: ActionsProps) {
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

    return (
        <>
            <div className="flex gap-3">
                {/* Botão Nova Meta (Secundário) */}
                <button 
                    onClick={() => setIsGoalModalOpen(true)}
                    className="bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 px-4 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all active:scale-95"
                >
                    <Target size={18} />
                    Nova Meta
                </button>

                {/* Botão Nova Atividade (Primário) */}
                <button 
                    onClick={() => setIsActivityModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all active:scale-95"
                >
                    <PlusCircle size={20} />
                    Nova Atividade
                </button>
            </div>

            <CreateActivityModal 
                isOpen={isActivityModalOpen} 
                onClose={() => setIsActivityModalOpen(false)} 
                classroomId={classroomId}
                classroomName={classroomName}
            />

            <CreateGoalModal 
                isOpen={isGoalModalOpen}
                onClose={() => setIsGoalModalOpen(false)}
                classroomId={classroomId}
                classroomName={classroomName}
            />
        </>
    );
}