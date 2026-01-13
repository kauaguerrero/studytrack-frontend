'use client'

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { CreateActivityModal } from "@/components/modals/CreateActivityModal";

interface ActionsProps {
    classroomId: string;
    classroomName: string;
}

export function ClassroomActions({ classroomId, classroomName }: ActionsProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div className="flex gap-3">
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all active:scale-95"
                >
                    <PlusCircle size={20} />
                    Nova Atividade
                </button>
            </div>

            <CreateActivityModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                classroomId={classroomId}
                classroomName={classroomName}
            />
        </>
    );
}