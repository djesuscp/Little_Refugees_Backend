import subprocess
import sys
import os

# Variables.
app_DockerComposeLocation = '.\\docker'
cicd_DockerComposeLocation = '.\\docker\\cicdContainer'
networkAppName = 'zkSpringbootREST_network'
networkCiCdName = 'ci-cd_network'
sharedNetworkName = 'shared_network'
pipelinerName = 'jenkins'
codeScannerName = 'sonarqube'
codeScannerDataBaseName = 'postgres'
appDataBaseName = 'mysql'
appName = 'backendApp'

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

# Docker start all containers.
def startAllcontainers():
    print(f' {stylizedStr(1, 33, 'Starting all containers...')}')
    run(f'powershell -Command "docker start $(docker ps -aq)"')

# Docker stop all containers.
def stopAllcontainers():
    print(f' {stylizedStr(1, 33, 'Stopping all containers...')}')
    run(f'powershell -Command "docker stop $(docker ps -q)"')

# Docker system prune.
def systemPrune():
    print(f' {stylizedStr(1, 33, 'Pruning system...')}')
    run(f'docker system prune -a -f')

# Docker volume prune.
def volumePrune():
    print(f' {stylizedStr(1, 33, 'Pruning volumes...')}')
    run(f'docker volume prune -a -f')

# Docker delete images.
def deleteImages():
    print(f' {stylizedStr(1, 33, 'Removing images...')}')
    run(f'powershell -Command "docker rmi -f $(docker images -aq)"')

# Docker network create.
def createNetwork(name):
    msg = f'Creating {name} docker network...'
    print(f' {stylizedStr(1, 33, msg)}')
    run(f'docker network create {name}')

# Docker compose build.
def build(dir):
    print(f' {stylizedStr(1, 33, 'Composing and building...')}')
    runDir(f'docker compose up -d --build', dir)

# Docker compose up.
def compose(dir):
    print(f' {stylizedStr(1, 33, 'Composing up...')}')
    runDir(f'docker compose up -d', dir)

# Docker compose stop.
def startService(service, dir):
    msg = f'Starting service {service}...'
    print(f' {stylizedStr(1, 33, msg)}')
    runDir(f'docker compose up -d {service}', dir)

# Docker compose stop.
def stopService(service, dir):
    msg = f'Stopping service {service}...'
    print(f' {stylizedStr(1, 33, msg)}')
    runDir(f'docker compose stop {service}', dir)

# Docker rebuild APP.
def rebuildService(service, dir):
    msg = f'Rebuilding {service}...'
    print(f' {stylizedStr(1, 33, msg)}')
    # runDir(f'docker compose down', dir)
    # runDir(f'docker compose build {service}', dir)
    # runDir(f'docker compose up -d', dir)
    runDir(f'docker compose rm -sf {service}', dir)
    runDir(f'docker compose build {service}', dir)
    runDir(f'docker compose up -d {service}', dir)

# Docker reset and rebuild everything.
def resetRebuildEverything():
    stopAllcontainers()
    systemPrune()
    volumePrune()
    createNetwork(sharedNetworkName)
    # createNetwork(networkAppName)
    # createNetwork(networkCiCdName)
    build(app_DockerComposeLocation)
    build(cicd_DockerComposeLocation)

# Docker reset everything.
def resetEverything():
    stopAllcontainers()
    systemPrune()
    volumePrune()

# Docker reset and rebuild docker compose.
def resetRebuildCompose(dir):
    runDir(f'docker compose down --volumes', dir)
    runDir(f'docker image prune -f', dir)
    build(dir)

# Docker menu.
def dockerMenu():
    print(f'{stylizedStr(1, 34, 'DOCKER MENU')}:\n1. Start all containers.\n2. Stop all containers.\n3. Reset and Rebuild EVERYTHING.\n4. Reset EVERYTHING.\n5. Build EVERYTHING.\n6. Delete ALL images.\n7. Delete ALL volumes.\n8. System prune ALL.\n9. Create docker shared_network.')
    option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
    match option:
        case '1':
            startAllcontainers()
        case '2':
            stopAllcontainers()
        case '3':
            resetRebuildEverything()
        case '4':
            resetEverything()
        case '5':
            build(app_DockerComposeLocation)
            build(cicd_DockerComposeLocation)
        case '6':
            deleteImages()
        case '7':
            volumePrune()
        case '8':
            systemPrune()
        case '9':
            createNetwork(sharedNetworkName)
        case _:
            menu()

# Docker CI-CD menu.
def cicdMenu():
    print(f'{stylizedStr(1, 33, 'CI-CD MENU')}:\n1. Rebuild CI-CD services.\n2. Start CI-CD services.\n3. Stop CI-CD services.\n4. Reset and Rebuild CI-CD.\n5. Create CI-CD docker network.')
    option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
    match option:
        case '1':
            print(f'{stylizedStr(0, 33, 'SERVICES to REBUILD')}:\n1. {pipelinerName.capitalize()}.\n2. {codeScannerName.capitalize()}.\n3. {codeScannerDataBaseName.capitalize()}.\n4. ALL.')
            option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
            match option:
                case '1':
                    rebuildService(pipelinerName, cicd_DockerComposeLocation)
                    if pipelinerName == 'jenkins':
                        print(f'{stylizedStr(0, 33, 'HERE IS YOUR INITIAL JENKINS PASSWORD')}:')
                        runDir(f'docker-compose exec {pipelinerName} cat /var/jenkins_home/secrets/initialAdminPassword', cicd_DockerComposeLocation)
                    # # TESTING.
                    # runDir(f'docker-compose exec {pipelinerName} /bin/bash /tmp/install_docker.sh', cicd_DockerComposeLocation)
                    # runDir(f'docker-compose exec {pipelinerName} /bin/bash rm -f /tmp/install_docker.sh', cicd_DockerComposeLocation)
                    # # END OF TESTING.
                case '2':
                    rebuildService(codeScannerName, cicd_DockerComposeLocation)
                case '3':
                    rebuildService(codeScannerDataBaseName, cicd_DockerComposeLocation)
                case '4':
                    build(cicd_DockerComposeLocation)
                case _:
                    cicdMenu()          
        case '2':
            print(f'{stylizedStr(0, 32, 'SERVICES to START')}:\n1. {pipelinerName.capitalize()}.\n2. {codeScannerName.capitalize()}.\n3. {codeScannerDataBaseName.capitalize()}.\n4. ALL.')
            option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
            match option:
                case '1':
                    startService(pipelinerName, cicd_DockerComposeLocation)
                case '2':
                    startService(codeScannerName, cicd_DockerComposeLocation)
                case '3':
                    startService(codeScannerDataBaseName, cicd_DockerComposeLocation)
                case '4':
                    compose(cicd_DockerComposeLocation)
                case _:
                    cicdMenu()
        case '3':
            print(f'{stylizedStr(0, 31, 'SERVICES to STOP')}:\n1. {pipelinerName.capitalize()}.\n2. {codeScannerName.capitalize()}.\n3. {codeScannerDataBaseName.capitalize()}.\n4. ALL.')
            option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
            match option:
                case '1':
                    stopService(pipelinerName, cicd_DockerComposeLocation)
                case '2':
                    stopService(codeScannerName, cicd_DockerComposeLocation)
                case '3':
                    stopService(codeScannerDataBaseName, cicd_DockerComposeLocation)
                case '4':
                    stopService(pipelinerName, cicd_DockerComposeLocation)
                    stopService(codeScannerName, cicd_DockerComposeLocation)
                    stopService(codeScannerDataBaseName, cicd_DockerComposeLocation)
                case _:
                    cicdMenu()                
        case '4':
            resetRebuildCompose(cicd_DockerComposeLocation)
        case '5':
            createNetwork(networkCiCdName)
        case _:
            menu()

# Docker app menu.
def appMenu():
    print(f'{stylizedStr(1, 36, 'APP MENU')}:\n1. Rebuild APP services.\n2. Start APP services.\n3. Stop APP services.\n4. Reset and Rebuild APP.\n5. Create APP docker network.')
    option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
    match option:
        case '1':
            print(f'{stylizedStr(0, 33, 'SERVICES to REBUILD')}:\n1. {appDataBaseName.capitalize()}.\n2. {appName.capitalize()}.\n3. ALL.')
            option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
            match option:
                case '1':
                    rebuildService(appDataBaseName, app_DockerComposeLocation)
                case '2':
                    rebuildService(appName, app_DockerComposeLocation)
                case '3':
                    build(app_DockerComposeLocation)
                case _:
                    appMenu()            
        case '2':
            print(f'{stylizedStr(0, 32, 'SERVICES to START')}:\n1. {appDataBaseName.capitalize()}.\n2. {appName.capitalize()}.\n3. ALL.')
            option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
            match option:
                case '1':
                    startService(appDataBaseName, app_DockerComposeLocation)
                case '2':
                    startService(appName, app_DockerComposeLocation)
                case '3':
                    compose(app_DockerComposeLocation)
                case _:
                    appMenu()
        case '3':
            print(f'{stylizedStr(0, 31, 'SERVICES to STOP')}:\n1. {appDataBaseName.capitalize()}.\n2. {appName.capitalize()}.\n3. ALL.')
            option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
            match option:
                case '1':
                    stopService(appDataBaseName, app_DockerComposeLocation)
                case '2':
                    stopService(appName, app_DockerComposeLocation)
                case '3':
                    stopService(appDataBaseName, app_DockerComposeLocation)
                    stopService(appName, app_DockerComposeLocation)
                case _:
                    appMenu()
        case '4':
            resetRebuildCompose(app_DockerComposeLocation)
        case '5':
            createNetwork(networkAppName)
        case _:
            menu()

# Main menu.
def menu():
    print(f'{stylizedStr(1, 35, 'MAIN MENU')}:\n1. APP menu.\n2. CI-CD Menu.\n3. Docker Menu.')
    option = input(f'{stylizedStr(1, 37, 'Please, choose an option by introducing its number>')}')
    match option:
        case '1':
            appMenu()
        case '2':
            cicdMenu()
        case '3':
            dockerMenu()
        case _:
            sys.exit(f'Log> {stylizedStr(1, 31, 'Program finished.')}')

if __name__ == '__main__':
    menu()