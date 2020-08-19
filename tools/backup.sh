filename="backups/HiddenJVC_$(date +%Y-%m-%d"_"%H-%M-%S).sql"

if [[ ! -d backups ]]; then
    mkdir backups
fi

docker exec -t  hidden-database pg_dump -c -U  hidden-jvc-user HiddenJVC > $filename