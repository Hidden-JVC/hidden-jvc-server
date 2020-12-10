#!/bin/bash

# exit on errors
set -e

# directory of this script
scriptDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# load environment variables
set -a
source "${scriptDir}/.env"
set +a

regularBackupFilePath="${scriptDir}/../backups/HiddenJVC_$(date +%Y-%m-%d"_"%H-%M-%S).sql"
publicBackupFilename="HiddenJVC_$(date +%Y-%m-%d"_"%H-%M-%S)_Public.sql"
publicBackupFilePath="${scriptDir}/../backups/${publicBackupFilename}"

mkdir -p "${scriptDir}/../backups"

# regular backup
docker exec -t hidden-database pg_dump -c -U hidden-jvc-user HiddenJVC > $regularBackupFilePath

# restore the backup to a new database
cat $regularBackupFilePath | docker exec -i hidden-database psql -U hidden-jvc-user -d HiddenJVCBackups
# remove sensible data
cat "${scriptDir}/publicBackup.sql" | docker exec -i hidden-database psql -U hidden-jvc-user -d HiddenJVCBackups
# create the public backup
docker exec -t hidden-database pg_dump -c -U hidden-jvc-user HiddenJVCBackups > $publicBackupFilePath

mv $publicBackupFilePath "${publicBackupDir}/${publicBackupFilename}"