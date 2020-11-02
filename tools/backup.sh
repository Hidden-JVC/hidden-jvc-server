regularBackupFilename="backups/HiddenJVC_$(date +%Y-%m-%d"_"%H-%M-%S).sql"
noPasswordBackupFilename="backups/HiddenJVC_$(date +%Y-%m-%d"_"%H-%M-%S)_Public.sql"

if [[ ! -d "backups" ]]; then
    mkdir "backups"
fi

# regular backup
docker exec -t hidden-database pg_dump -c -U hidden-jvc-user HiddenJVC > $regularBackupFilename

# restore the backup to a new database
cat $regularBackupFilename | docker exec -i hidden-database psql -U hidden-jvc-user -d HiddenJVCBackups
# remove users passwords from this database
cat tools/publicBackup.sql | docker exec -i hidden-database psql -U hidden-jvc-user -d HiddenJVCBackups
# create a backup without passwords
docker exec -t hidden-database pg_dump -c -U hidden-jvc-user HiddenJVCBackups > $noPasswordBackupFilename
