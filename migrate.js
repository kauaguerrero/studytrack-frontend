const fs = require('fs');
const path = require('path');

// Função utilitária para mover pastas/arquivos
const moveItem = (src, dest) => {
    if (fs.existsSync(src)) {
        try {
            // Garante que a pasta pai do destino existe
            const destDir = path.dirname(dest);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }

            fs.renameSync(src, dest);
            console.log(`✅ Movido: ${src} -> ${dest}`);
        } catch (err) {
            console.error(`❌ Erro ao mover ${src}:`, err.message);
        }
    } else {
        console.log(`⚠️ Item não encontrado (ignorado): ${src}`);
    }
};

// Função para garantir que pastas existam
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📂 Criado: ${dir}`);
    }
};

console.log('🚀 Iniciando migração da estrutura B2B...');

// 1. Criar a estrutura base de pastas
const baseDirs = [
    'src/app/(public)',
    'src/app/(public)/auth',
    'src/app/(portal)',
    'src/app/(portal)/student',
    'src/app/(portal)/teacher',
    'src/app/(portal)/manager',
    'src/types'
];

baseDirs.forEach(ensureDir);

// 2. Mover arquivos soltos
// Landing Page
if (fs.existsSync('src/app/page.tsx')) {
    moveItem('src/app/page.tsx', 'src/app/(public)/page.tsx');
}

// 3. Mover pastas inteiras
// Auth (Login/Register)
if (fs.existsSync('src/app/auth')) {
    // Mover conteúdo de auth para (public)/auth
    // Precisamos ler o diretório pois 'auth' é pai
    const files = fs.readdirSync('src/app/auth');
    files.forEach(file => {
        moveItem(path.join('src/app/auth', file), path.join('src/app/(public)/auth', file));
    });
    // Remove a pasta auth antiga se ficou vazia
    try { fs.rmdirSync('src/app/auth'); } catch (e) {}
}

// Dashboard (vai para student)
moveItem('src/app/dashboard', 'src/app/(portal)/student/dashboard');

// Simulado
moveItem('src/app/simulado', 'src/app/(portal)/student/simulado');

// Banco de Questões
moveItem('src/app/banco-de-questoes', 'src/app/(portal)/student/banco-de-questoes');

// Admin (vira Manager)
if (fs.existsSync('src/app/admin')) {
    // Move o conteúdo de admin para manager
    const files = fs.readdirSync('src/app/admin');
    files.forEach(file => {
        moveItem(path.join('src/app/admin', file), path.join('src/app/(portal)/manager', file));
    });
    try { fs.rmdirSync('src/app/admin'); } catch (e) {}
    console.log('✅ Admin convertido em Manager');
}

// 4. Criar arquivos placeholder se não existirem
const teacherPage = 'src/app/(portal)/teacher/page.tsx';
if (!fs.existsSync(teacherPage)) {
    fs.writeFileSync(teacherPage, 'export default function TeacherPage() { return <div className="p-4"><h1>Área do Professor</h1><p>Em construção...</p></div>; }');
    console.log('✅ Página dummy de Professor criada');
}

const managerPage = 'src/app/(portal)/manager/page.tsx';
if (!fs.existsSync(managerPage) && !fs.existsSync('src/app/(portal)/manager/dashboard')) {
     // Se não moveu nada do admin, cria um dummy
     fs.writeFileSync(managerPage, 'export default function ManagerPage() { return <div className="p-4"><h1>Visão do Gestor</h1><p>KPIs da Escola aqui.</p></div>; }');
     console.log('✅ Página dummy de Gestor criada');
}

console.log('🎉 Migração concluída! Agora delete este arquivo "migrate.js".');