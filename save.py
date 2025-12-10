import subprocess
from datetime import datetime

def run(message, command):
    currentDate = datetime.now()
    currentDateFormated = currentDate.strftime("%Y-%m-%d %H:%M:%S")
    try:
        if message == '' and 'commit' not in command:
            result = subprocess.run(command, shell=True, check=True)
            if 'add' in command:
                print(f'Log> \033[1;37mGit add -A\033[0m \033[1;32msuccessful\033[0m.')
            elif 'push' in command:
                print(f'Log> \033[1;37mGit push\033[0m \033[1;32mcompleted\033[0m.')
        elif message == '' and 'commit' in command:
            result = subprocess.run(f'{command}"Emergency save dated: {currentDateFormated}"', shell=True, check=True)
            print(f'Log> {result.stdout}')
        else:
            result = subprocess.run(f'{command}"{message}. Dated: {currentDateFormated}"', shell=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f'\033[1;31mERROR!\033[0m> {e.stderr}')

if __name__ == '__main__':
    run('', f'git add -A')
    run(input('Input commit message> '), f'git commit -m')
    run('', f'git push')