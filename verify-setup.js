#!/usr/bin/env node

/**
 * Script de prueba para el sistema inteligente
 * Verifica que Python y Node.js están configurados correctamente
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🔍 Verificando instalación del Sistema Inteligente...\n');

// 1. Verificar Python
console.log('1️⃣ Verificando Python...');
const python = spawn('python', ['--version']);

python.stdout.on('data', (data) => {
    console.log(`   ✅ ${data.toString().trim()}`);
});

python.stderr.on('data', (data) => {
    console.log(`   Version: ${data.toString().trim()}`);
});

python.on('error', () => {
    console.log('   ❌ Python no encontrado. Intenta "python3 --version"');
    process.exit(1);
});

python.on('close', (code) => {
    if (code === 0 || code === null) {
        console.log('\n2️⃣ Verificando Node.js...');
        const nodeVersion = process.version;
        console.log(`   ✅ Node.js ${nodeVersion}`);
        
        console.log('\n3️⃣ Verificando archivos...');
        
        const archivos = [
            'server.js',
            'scripts/inteligence.py',
            'static/traductor-inteligente.js',
            'static/javascript.js',
            'JSON/nahuatl.JSON'
        ];
        
        let allFound = true;
        archivos.forEach(archivo => {
            const ruta = path.join(__dirname, archivo);
            if (fs.existsSync(ruta)) {
                console.log(`   ✅ ${archivo}`);
            } else {
                console.log(`   ❌ ${archivo} NO ENCONTRADO`);
                allFound = false;
            }
        });
        
        if (allFound) {
            console.log('\n4️⃣ Verificando Express...');
            try {
                require('express');
                console.log('   ✅ Express instalado');
            } catch (e) {
                console.log('   ❌ Express no instalado. Ejecuta: npm install');
                process.exit(1);
            }
            
            console.log('\n✨ ¡Sistema listo para usar!');
            console.log('\n▶️  Para iniciar el servidor:');
            console.log('   npm start\n');
            console.log('📖 Documentación: Abre INTELIGENCIA_ARTIFICIAL.md\n');
        }
    }
});
