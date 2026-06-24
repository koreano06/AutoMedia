# Monitoramento da VM AutoMedia

Este checklist ajuda a validar se a plataforma esta pronta para uso real quando o frontend aponta para o backend da VM.

## Servicos principais

| Componente | Como validar | Esperado |
| --- | --- | --- |
| Backend API | `curl http://localhost:3333/api/health` | `{"status":"ok","service":"automedia-api"}` |
| Worker de video | `sudo systemctl status automedia-video-worker --no-pager -l` | `active (running)` |
| API systemd | `sudo systemctl status automedia-backend --no-pager -l` | `active (running)` |
| Postgres | `docker exec -it automedia-postgres pg_isready -U automedia -d automedia` | `accepting connections` |
| Redis | `docker exec -it automedia-redis redis-cli ping` | `PONG` |
| MinIO/S3 | `curl -I http://192.168.1.42:9000` | Resposta HTTP do MinIO |

## Portas esperadas

- `3333`: API do backend.
- `5432`: Postgres, preferencialmente restrito a rede local.
- `6379`: Redis, preferencialmente restrito a rede local.
- `9000`: MinIO API, usado para arquivos de imagem/video.
- `9001`: Console MinIO, acesso administrativo.

## Comandos uteis

```bash
cd ~/automedia
docker compose ps

cd ~/automedia/backend
~/automedia/deploy-backend.sh

sudo journalctl -u automedia-backend -n 80 --no-pager
sudo journalctl -u automedia-video-worker -n 80 --no-pager
```

## Sinais de alerta

- API responde localmente, mas o frontend nao carrega: conferir `VITE_API_BASE_URL` no frontend e `CORS_ORIGIN` no backend.
- Arquivo antigo nao abre: procurar URLs antigas no banco e substituir pelo IP atual da VM.
- Job fica preso: conferir Redis, worker e logs do provider de IA.
- Upload salva mas nao aparece: conferir resposta de `/api/media`, MinIO e se o asset foi salvo como `image`.

## Recomendacao de rotina

1. Rodar `~/automedia/deploy-backend.sh` apos cada push do backend.
2. Validar `/api/health`.
3. Abrir a biblioteca no frontend e confirmar uma imagem recente.
4. Gerar um video curto de teste sem gastar muito credito.
5. Conferir logs do worker se o job nao sair da fila.
