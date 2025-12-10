import subprocess
import sys
import shutil
import os

# Basic variables.
frontendDir = 'frontend'
backendDir = 'backend'
serverbaseText = """const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/meanDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Conectado a MongoDB'))
.catch((err) => console.error('Error al conectar a MongoDB:', err));

// Ruta de ejemplo
app.get('/', (req, res) => {
  res.send('¡Hola desde Express en el backend!');
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});"""
corsText = """const cors = require('cors');
app.use(cors());
"""
gitIgnoreText = """/backend/node_modules
/frontend/node_modules"""

tsConfigJsonText = """{
  "compilerOptions": {
    "target": "ES6",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  }
}"""

indexTsText = """import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get('/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});"""

prismaSampleText = """generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int     @id @default(autoincrement())
  name    String
  email     String  @unique
  createdIn  DateTime @default(now())
}
"""

# Function to stylize text.
def stylizedStr(textStyle, color, string):
    return f'\033[{textStyle};{color}m{string}\033[0m'

# Function to check if a directory already exists.
def checkDirectory(directory):
    if os.path.isdir(directory):
        return True
    else:
        return False

# Function which receives a command and a directory in which the comand will be executed in CMD.
def runDir(command, directory):
    try:
        result = subprocess.run(command, cwd=directory, shell=True, check=True)
        if result.returncode == 0:
            print(f'Log> {stylizedStr(1, 32, 'Command successfully executed')} -> {stylizedStr(1, 37, f'{command}')}\n{result.stdout}')
        else:
            print(f'{stylizedStr(1, 31, 'ERROR!')}> An error ocurred during execution.\n{result.stderr}')
    except subprocess.CalledProcessError as e:
        print(f'{stylizedStr(1, 31, 'ERROR!')}> {e}')

# Function which receives a command that will be executed in CMD.
def run(command):
    try:
        result = subprocess.run(command, shell=True, check=True)
        if result.returncode == 0:
            print(f'Log> {stylizedStr(1, 32, 'Command successfully executed')} -> {stylizedStr(1, 37, f'{command}')}\n{result.stdout}')
        else:
            print(f'{stylizedStr(1, 31, 'ERROR!')}> An error ocurred during execution.\n{result.stderr}')
    except subprocess.CalledProcessError as e:
        print(f'{stylizedStr(1, 31, 'ERROR!')}> {e}')

# Function which receives a file path and a text which will be written to the specified file.
def writeFile(file, text):
    with open(file, 'w', encoding='utf-8') as f:
        f.writelines(text)
    print(f'Log> {stylizedStr(1, 32, f'{file} successfully written.')}')

# Function which receives a file path whose content will be read and returned as string.
def readFile(file):
    with open(file, 'r', encoding='utf-8') as f:
        text = f.readlines()
        print(f'Log> {stylizedStr(1, 32, f'{file} successfully read.')}')
        return text

# Function which receives a file path, a line number, and a text which will be included in the specified line into the specified file.
def insertTextToFile(file, line, newText):
    text = readFile(file)
    text.insert(line, newText)
    writeFile(file, text)
    print(f'Log> {stylizedStr(1, 32, f'Text successfully inserted into {file}.')}')

# Function which checks if Angular CLI is already installed in the system.
def checkAngular():
    if shutil.which('ng') is None:
        return False
    else:
        return True

# Function which installs Angular CLI.
def installAngular():
    if not checkAngular():
        print(f'{stylizedStr(1, 33, 'Angular is not present in the system.')} {stylizedStr(1, 32, 'Installing Angular...')}')
        run(f'npm install -g @angular/cli')
    else:
        print(f' {stylizedStr(1, 32, 'Angular is already installed in your system.')}')
        run(f'ng version')

# Function to install Backend. Includes some sample code in a "server.js" file.
def installBackend(orm):
    if checkDirectory(backendDir):
        print(f'Seems that {stylizedStr(1, 33, 'Backend is already installed.')}')
        if checkDirectory(f'{backendDir}\\node_modules'):
            print(f'Seems that {stylizedStr(1, 33, 'Node_modules are already installed.')}')
            checkNodeModules('update', backendDir)
        else:
            checkNodeModules('install', backendDir)
    else:
        run(f'mkdir {backendDir}')
        runDir(f'npm init -y', backendDir)
        runDir(f'npm install express --save', backendDir)
        if orm == 'mongoose':
            runDir(f'npm install mongoose --save', backendDir)
            writeFile(f'{backendDir}\\server.js', serverbaseText)
        else:
            runDir(f'npm install -D typescript ts-node-dev @types/node @types/express', backendDir)
            writeFile(f'{backendDir}\\tsconfig.json', tsConfigJsonText)
            runDir(f'mkdir src', backendDir)
            writeFile(f'{backendDir}\\src\\index.ts', indexTsText)
            insertTextToFile(f'{backendDir}\\package.json', 5, '    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",\n')
            runDir(f'npm install prisma --save-dev', backendDir)
            runDir(f'npx prisma init', backendDir)
            dbName = input(f'{stylizedStr(1, 37, 'Please, write your DB name>')}')
            insertTextToFile(f'{backendDir}\\.env', 6, f'DATABASE_URL="mysql://root@localhost:3306/{dbName}"\n#')
            runDir(f'del /f /q schema.prisma', f'{backendDir}\\prisma')
            writeFile(f'{backendDir}\\prisma\\schema.prisma', prismaSampleText)
            runDir(f'npx prisma migrate dev --name init', backendDir)
            runDir(f'npx prisma generate', backendDir)
            runDir(f'del /f /q .gitignore', backendDir)
            runDir(f'npm install jsonwebtoken bcryptjs', backendDir)
            runDir(f'npm install --save-dev @types/jsonwebtoken @types/bcryptjs', backendDir)

# Function to install Angular Frontend.
def installFrontend():
    if checkDirectory(frontendDir):
        print(f'Seems that {stylizedStr(1, 33, 'Frontend is already installed.')}')
        if checkDirectory(f'{frontendDir}\\node_modules'):
            print(f'Seems that {stylizedStr(1, 33, 'Node_modules are already installed.')}')
            checkNodeModules('update', frontendDir)
        else:
            checkNodeModules('install', frontendDir)
    else:
        print(f'{stylizedStr(1, 33, 'Angular Frontend is not present.')} {stylizedStr(1, 32, 'Creating Angular project...')}')
        run(f'ng new {frontendDir}')
        runDir(f'npm audit fix --force', frontendDir)

def checkNodeModules(function, projectFolder):
    if function == 'install':
        print(f'Seems that {stylizedStr(1, 33, 'Node_modules are NOT present.')} {stylizedStr(1, 32, 'Installing Node_modules...')}')
        selection = input(f'{stylizedStr(1, 37, 'Do you want to install Node_modules?(y/n)>')}')
        if selection == 'y':
            runDir(f'npm install', projectFolder)
            runDir(f'npm audit fix', projectFolder)
            print(f'{stylizedStr(1, 32, f'Node_modules for {projectFolder} have been successfully installed.')}')
        else:
            print(f'{stylizedStr(1, 37, 'Node_modules install cancelled, going back to Main Menu...')}')
            menu()
    else:
        selection = input(f'{stylizedStr(1, 33, 'PLEASE, be aware that this action can change your project dependencies, causing critical discrepances in its functionality.')} {stylizedStr(1, 37, 'Do you want to update Node_modules?(y/n)>')}')
        if selection == 'y':
            runDir(f'npm update', projectFolder)
            runDir(f'npm audit fix', projectFolder)
            print(f'{stylizedStr(1, 32, 'Node_modules are up to date.')}')
        else:
            print(f'{stylizedStr(1, 37, 'Node_modules update cancelled, going back to Main Menu...')}')
            menu()

# Function to install CORS to communicate Backend with Frontend, also adds the required lines of code to "server.js" file.
def installCors():
    if checkDirectory(f'{backendDir}\\prisma'):
        runDir(f'npm install cors --save', backendDir)
        runDir(f'npm install -D @types/cors', backendDir)
        insertTextToFile(f'{backendDir}\\src\\index.ts', 2, "import cors from 'cors';\n")
        insertTextToFile(f'{backendDir}\\src\\index.ts', 6, "app.use(cors());\n")
    else:
        runDir(f'npm install cors --save', backendDir)
        insertTextToFile(f'{backendDir}\\server.js', 8, corsText)

def installDotEnv():
    if checkDirectory(f'{backendDir}\\prisma'):
        runDir(f'npm install dotenv', backendDir)
        runDir(f'npm install -D @types/dotenv', backendDir)
        insertTextToFile(f'{backendDir}\\src\\index.ts', 2, "import dotenv from 'dotenv';\n")
        insertTextToFile(f'{backendDir}\\src\\index.ts', 4, "dotenv.config();\n")
    else:
        runDir(f'npm install dotenv', backendDir)
        insertTextToFile(f'{backendDir}\\server.js', 2, "const dotenv = require('dotenv');\n")
        insertTextToFile(f'{backendDir}\\server.js', 5, "dotenv.config();\n")

# Function that creates a customized .gitignore file for the FARM project.
def implementGitIgnore():
    writeFile('.gitignore', gitIgnoreText)

def generateAngularElem(type, folder, name):
    runDir(f'ng generate {type} {folder}/{name}', frontendDir)

# Angular submenu.
def angularMenu():
    print(f'{stylizedStr(1, 34, 'Angular Menu')}:\n1. Generate component.\n2. Generate Service.\n3. Generate Module.\n4. Generate Directive.\n5. Generate Pipe.\n6. Generate Guard.\n7. Generate Interceptor.\n8. Generate Class.\n9. Generate Interface.\n10. Generate Enum.')
    option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
    match option:
        case '1':
            name = input(f'{stylizedStr(1, 37, 'Please, write the name of your component>')}')
            generateAngularElem('component', 'components', name)
        case '2':
            name = input(f'{stylizedStr(1, 37, 'Please, write the name of your service>')}')
            generateAngularElem('service', 'services', name)
        case '3':
            name = input(f'{stylizedStr(1, 37, 'Please, write the name of your module>')}')
            generateAngularElem('module', 'modules', name)
        case '4':
            name = input(f'{stylizedStr(1, 37, 'Please, write the name of your directive>')}')
            generateAngularElem('directive', 'directives', name)
        case '5':
            name = input(f'{stylizedStr(1, 37, 'Please, write the name of your pipe>')}')
            generateAngularElem('pipe', 'pipes', name)
        case '6':
            name = input(f'{stylizedStr(1, 37, 'Please, write the name of your guard>')}')
            generateAngularElem('guard', 'guards', name)
        case '7':
            name = input(f'{stylizedStr(1, 37, 'Please, write the name of your interceptor>')}')
            generateAngularElem('interceptor', 'interceptors', name)
        case '8':
            name = input(f'{stylizedStr(1, 37, 'Please, write the name of your class>')}')
            generateAngularElem('class', 'classes', name)
        case '9':
            name = input(f'{stylizedStr(1, 37, 'Please, write the name of your interface>')}')
            generateAngularElem('interface', 'interfaces', name)
        case '10':
            name = input(f'{stylizedStr(1, 37, 'Please, write the name of your enum>')}')
            generateAngularElem('enum', 'enums', name)
        case _:
            manageFrontend()

# Backend submenu.
def manageBackend():
    print(f'{stylizedStr(1, 34, 'Backend Menu')}:\n1. Menu for MySql + PrismaDB Backend.\n2. Menu for MongoDB + Mongoose Backend.')
    option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
    match option:
        case '1':
            prismaMenu()
        case '2':
            mongoDbMenu()
        case _:
            menu()

# Prisma Submenu.
def prismaMenu():
    print(f'{stylizedStr(1, 34, 'Prisma Menu')}:\n1. MySql + PrismaDB Backend up.\n2. Prisma Generate.\n3. Prisma Migrate.')
    option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
    match option:
        case '1':
            runDir('npm run dev', f'.\\{backendDir}')
        case '2':
            runDir('npx prisma generate', f'.\\{backendDir}')
        case '3':
            name = input(f'{stylizedStr(1, 37, 'Please, choose a name for your prisma migration>')}')
            runDir(f'npx prisma migrate dev --name {name}', f'.\\{backendDir}')
        case _:
            manageBackend()

# Backend submenu.
def mongoDbMenu():
    print(f'{stylizedStr(1, 34, 'Mongo Menu')}:\n1. MongoDB up.\n2. MongoDB + Mongoose Backend up.')
    option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
    match option:
        case '1':
            run('mongod --config "C:\\mongodb\\mongod.cfg"')
        case '2':
            runDir('node server.js --watch', f'.\\{backendDir}')
        case _:
            manageBackend()

# Frontend submenu.
def manageFrontend():
    print(f'{stylizedStr(1, 34, 'Frontend Menu')}:\n1. Angular Frontend up.\n2. Angular Menu.')
    option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
    match option:
        case '1':
            runDir('ng serve -o', f'.\\{frontendDir}')
        case '2':
            angularMenu()
        case '3':
            runDir('node server.js --watch', f'.\\{backendDir}')
        case _:
            menu()

# Main menu of the program.
def menu():
    print(f'{stylizedStr(1, 36, 'Main Menu')}:\n1. Install Angular CLI.\n2. Install/Update Backend with Mongoose.\n3. Install/Update Backend with PrismaDB\n4. Install/Update Frontend.\n5. Integrate Backend & Frontend using CORS.\n6. Install DotEnv.\n7. Implement .gitignore.\n8. Backend Submenu.\n9. Frontend Submenu.')
    option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
    match option:
        case '1':
            installAngular()
        case '2':
            installBackend('mongoose')
        case '3':
            installBackend('prisma')
        case '4':
            installFrontend()
        case '5':
            installCors()
        case '6':
            installDotEnv()
        case '7':
            implementGitIgnore()
        case '8':
            manageBackend()
        case '9':
            manageFrontend()
        case _:
            sys.exit(f'Log> {stylizedStr(1, 31, 'Program finished.')}')

if __name__ == '__main__':
    menu()