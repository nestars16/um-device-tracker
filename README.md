# Despliege y Contenedorización de applicaciones web con Docker

### ¿ Qué es desplegar en el contextó de aplicaciones web?

Al hablar de desplegar aplicaciones web nos estamos refierendo al proceso
por el mediante cual le servimos nuestras aplicaciónes a nuestros usuarios
por medio de un servidor que ellos pueden solicitar desde sus
navegadores.

Las formas en las cuales se puede lograrlo son muy variadas, y siempre
depende de la tecnología e infraestructura en la cual "vivirán" nuestras
aplicaciones, esta variablidad es una de las dificultades principales con el
despliegue de software.

Antes de llegar hacia el rasocinio de el _porqué_ eligiríamos docker sobre cualquier
otro método de desplegar una aplicación, tenemos que poder ver la pintura completa hacia cuales
son las opciones para lograr nuestra meta de poner nuestro código en el navegador de el usuario

### Solo archivos

En nuestro caso vamos a desplegar un ejecutable, es decir que no tenemos que instalar
un interpretador e instalar las dependencias de nuestro proyecto, asegurandonos que las
librerias de sistemas en las cuales dependen nuestras dependencias esten correctamente instaladas
y/ó sean una version compatible...

Hay un poco que considerar incluso al solo estar lidiando con archivos para lograr ejecutar tu
aplicación, la principal consideración siendo los sistemas operativos y arquitecturas en los cuales estamos
compilando nuestro ejecutable, si son diferentes, se tendría que compilar para el sistema operativo y arquitectura
de cpu de nuestro servidor

En nuestro caso nuestro ambiente de desarrollo es igual al que de el servidor (Ubuntu 22.04.4 LTS)
por ende no sera una consideración

#### Los archivos

La estructura de los archivos escogida para nuestra aplicación es

```bash
./
├── static
│   ├── assets
│   │   ├── index-{content-hash}.js
│   │   └── index-{content-hash}.css
│   └── index.html
├── um-device-tracker
    
```

Donde `um-device-tracker` se trata de nuestro ejecutable, en el folder
`static/**.{js,css,html}` se encuentran todos los archivos de javascript
y css para poder cargar nuestra aplicación dentro de el html que serviremós

Genermoslos en nuestro ambiente de desarrollo!

1. um-device-tracker

En nuestro desarrollo de ambiente ya tenemos instalado nuestro compilador, el backend de esta aplicación
esta escrito en Rust, con su sistema de compilación integrado, por suerte, podemos conseguir un ejecutable optimizado
corriendo el comando 

```bash
cargo build --release
```

dentro de nuestro directorio de proyecto, y lo podemos ver en el directorio

```bash
.
├── Cargo.lock
├── Cargo.toml
├── README.md
├── justfile
├── src
│   └── *.rs
├── static
│   ├── assets
│   │   ├── index-{content-hash}.js
│   │   └── index-{content-hash}.css
│   └── index.html
├── target
   └── release
       └── um-device-tracker 👈---------- Aquí

```


2. static/**

Para esto tendremos que entrar al folder `frontend` donde tenemos
una aplicación de react, en nuestro caso solo correremos

```bash
npm run build
```

Luego veremos los archivos html, js y css creados

```bash
.
├── README.md
├── components.json
├── dist   👈------------------------------------------ este folder se vuelve el folder static
│   ├── assets
│   │   ├── index-{content-hash}.js   👈---- Todo se mantiene igual 
│   │   └── index-{content-hash}.css  👈---- Todo se mantiene igual 
│   └── index.html                    👈---- Todo se mantiene igual 
├── index.html
├── package-lock.json
├── package.json
├── postcss.config.js
├── src
│   ├── ...

```

Ahora toca desplegarlos.

Para esto ocuparemos un servicio de servidores virtuales llamado Hetzner, iremos a [su sitio web](https://console.hetzner.cloud/projects)
y crearemos nuestro proyecto, con las especificaciones deseadas

Para acceder el servidor de una forma mas ergonómica utilizaremos `ssh` y para permitirnos acceso al servidor
tenemos que proveer nuestra llave pública que en linux se encuentra en `~/.ssh/` y en nuestro caso
donde `~` es el directorio principal de el usuario

```bash
~/.ssh/
├── id_rsa
├── id_rsa.pub
├── known_hosts
└── known_hosts.old
```

si abrimos `id_rsa.pub` con `cat` veremos nuestra llave publica

```bash
⮞  cat ~/.ssh/id_rsa.pub
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDEbKyIMKS4pRrvClxASM6HazFypHLHYe+HCcIhawfVJROLtVhnU0PUI6olx+fDznP08/g93QFSCwtpASZXrO2cMGzCyhcN3CtR3xdZrjbUlBcc9xiCaSX8FGz2ECbg0CCGNTIz3DLy+I2WPRkJ63ufD2V1T2B/JiTzqTs3k2gmZSlEPvivgxCeNT3M4FmDioYbIGcFpQBGl3Our0TXKqm8eF9UTSPQyqgxdmiO4INErB3kHsnX3agAva5H/211ujKvt8XVrFw3YKUmNCD04OsqI9w+vt7youL3tlcFvFBV36V/80qSDEErYHWmd7gy0Vi4P/d18J6i8C+hbTwy7EW6OzOLXeLm+V8SJLi023032QxCxzmDBHO55VoBGYkZ+Dkh3ReFFucOBtHz4HOs4TTsO1jGUq+JKMCnHlpQHztdIyyYAUy+O2cYuzdI9q8QLA/s0hOtGpTX76lP+iR+16QinTPj7t6onYcBl7LE24yrJL51w923hmhavXK+RthRg9hON/zqJ0sgZGk9sMRRcLBuzV3kAUxXeIPBPWdF6qj8n+4caBuHnYFeAwOvJhO6JZhqP+/KmY4mPVhCE9CV43CbDUIJ0sVr1cXm5aOaSmpINTjUthmrfkOn3b3FAkxJJL9oIp5zciWi2PKYKawTsCFeDiRKBKa1o8Z9WXB+SsYiaQ== nesmb16@gmail.co
```

Una vez configurado el servidor podemos entrar con el comando

```bash
ssh root@$SERVER_IP
```

Sin embargo estamos accediendo con el usuario `root` el cual es el super usuario de el sistema,
esto no es deseable por razones de seguridad, monitoreo y escalabilidad, ¿Qué tal si le damos
acceso a otro usuario y deseamos auditar que cambios realizaron en el servidor? así que vamos a tomar
los pasos necesarios para protegernos de estos riesgos

Primero vamos a crear un usuario por el cual podemos ingresar

```bash
useradd -m $USERNAME
# la bandera -m es tal que crea un directorio para el usuario
usermod -aG sudo $USERNAME 
# Este comando nos dará acceso al comando de `sudo` para
# poder realizar comandos con privilegios elevados
passwd $USERNAME

# Los comandos siguientes se utilizan para 
# poder ingresar con ssh a nuestro
# usuario

sudo mkdir -p /home/$USERNAME/.ssh # Creamos un directorio para los credenciales ssh
sudo chmod 700 /home/$USERNAME/.ssh # le damos permisos a nuestro usuario
sudo chown $USERNAME:$USERNAME /home/$USERNAME/.ssh # transferimos propiedad de el directorio

sudo cp /root/.ssh/authorized_keys /home/$USERNAME/.ssh/ # Copiamos las credenciales de la cuenta


sudo chown $USERNAME:$USERNAME /home/$USERNAME/.ssh/authorized_keys # Transferimos el dueño a nuestro usuario
sudo chmod 600 /home/$USERNAME/.ssh/authorized_keys # le damos solo al dueño permisos de lectura y edición
```

Podemos salir y entrar con nuestro usuario creado

```bash
exit
ssh $USERNAME@$SERVER_IP
```

Ahora podemos deshabilitar ingreso con root,tendremos que editar el archivo
`/etc/ssh/sshd_config`

```bash
sudo vim /etc/ssh/sshd_config
# Pedira una contraseña
```

Estamos buscando estas lineas, sus valores
por defecto pueden variar

```
- PermitRootLogin yes
+ PermitRootLogin no
- PasswordAuthentication no
+ PasswordAuthentication yes
```

Luego reinciamos el servicio de ssh

```bash
sudo systemctl restart ssh
```

Despues de eso podemos finalmente transferir nuestros archivos, podemos correr el script 
mostrado anteriormente, pero primero tenemos que crear el directorio de la aplicación con el comando
`mkdir um-device-tracker` en nuestro servidor


```bash
rm -rf static/*  #👈------- Esto elimina los archivos existentes en el folder static para no causar colisiones
cd frontend && npm run build #👈---- generamos nuestros archivos estaticos
mv frontend/dist/* static # 👈---- Los movemos a nuestro directorio de static
cargo build --release #👈----- Compilamos nuestro binario
scp target/release/um-device-tracker nestor@$SERVER_IP:um-device-tracker # 👈----- Utilizamos ssh para copiar los archivos en el servidor
scp -r static nestor@$SERVER_IP:um-device-tracker #👈----- Utilizamos ssh para copiar los archivos en el servidor
scp .env nestor@$SERVER_IP:um-device-tracker

```

Luego dentro de el servidor, podemos iniciar nuestra aplicación
con el siguiente comando:

```bash
nohup um-device-tracker/um-device-tracker &
```

Donde `nohup` es un programa que permite que un proceso iniciado
con una sesión de terminal no sea terminado al salir de esa sesión 
permitiendo que la aplicación siga corriendo

Y así desplegaron un app!

### Contenedorización

#### ¿ Qué es contenedorización y porqué nos interesa?

Consideremos la cantidad de pasos que acabamos de tomar para desplegar una aplicación
que unicamente consiste 

```bash
.
└── um-device-tracker
    ├── static
    │   ├── assets
    │   │   ├── index-CkdncMF8.js
    │   │   └── index-DAqDhONt.css
    │   └── index.html
    └── um-device-tracker
```

Ahora ¿qué ocurre si no utilizamos un lenguaje compilado donde necesitamos
instalar un interpretador o un entorno de ejecución para poder ejecutar
nuestro código? La complejidad y cantidad de consideraciones de la serie
de pasos necesarios para que nuestra aplicación sea accesible tiene el potencial de
incrementa exponencialmente

Para eso existe la contenedorización, que se trata simplemente de un proceso
por el cual nosotros empacamos todo lo que nuestra aplicación necesita para ejecutar
dentro de una especie de maquina virtual que es aisladado de nuestro sistema huesped
pero al mismo tiempo comparte su kernel para no incurrir los costos de rendimiento
de una maquina virtual tradicional con un hipervisor

Esto resuelve nuestro problema de despliegue, ya que nos da una forma por
donde podemos definir lo que necesita nuestro ambiente y poder replicarlo
de forma trivial!

#### Contenedorización de aplicación

Antes que todo, quisiera instalar docker en el servidor para poder enfocarnos en el despliegue
y explicación de como definimos imagenes

Si vamos a [https://docs.docker.com/engine/install/ubuntu/](https://docs.docker.com/engine/install/ubuntu/)
vamos a poder encontrar los pasos a seguir

Ahora vamos a inspeccionar nuestro `Dockerfile`

```dockerfile
FROM ubuntu:22.04 AS base

FROM base AS builder

# Aqui instalamos librerias de sistema y el compilador de rust
RUN set -eux; \  
        apt update; \
		apt install -y --no-install-recommends curl ca-certificates gcc libc6-dev pkg-config libssl-dev; \
        curl --location --fail \
            "https://static.rust-lang.org/rustup/dist/x86_64-unknown-linux-gnu/rustup-init" \
            --output rustup-init; \
        chmod +x rustup-init; \
        ./rustup-init -y --no-modify-path --default-toolchain stable; \
        rm rustup-init;

ENV PATH=${PATH}:/root/.cargo/bin

# Probamos que la instalación haya sido exitosa 
RUN set -eux; \
		rustup --version;

WORKDIR /app

# Copiamos todo lo necesario 
COPY src src
COPY static static
COPY Cargo.toml Cargo.lock ./
RUN set -eux; \
    cargo build --release;\
    objcopy --compress-debug-sections ./target/release/um-device-tracker ./um-device-tracker

FROM base AS APP

SHELL ["/bin/bash", "-c"]

RUN set -eux; \
		apt update; \
		apt install -y --no-install-recommends \
			ca-certificates \
			; \
		apt clean autoclean; \
		apt autoremove --yes; \
		rm -rf /var/lib/{apt,dpkg,cache,log}/

WORKDIR /app
COPY --from=builder /app/um-device-tracker .
COPY static static
COPY .env .

CMD ["/app/um-device-tracker"]
```

Con esto podemos crear nuestra imagen y poder subirla a un repositorio de artefactos para poder descargarla facilmente
desde nuestro servidor

Para crear y subir nuestra imagen correremos, esto necesitará que estemos autenticados a una cuenta de google
via la cli de gcloud

```bash
docker build --build-arg DATABASE_URL=$DATABASE_URL -t us-east1-docker.pkg.dev/miscellaneous-429614/misc/um-device-tracker .
docker push us-east1-docker.pkg.dev/miscellaneous-429614/misc/um-device-tracker
```

Y en nuestro servidor

```bash
docker pull us-east1-docker.pkg.dev/miscellaneous-429614/misc/um-device-tracker
```

y para correrlo

```bash
docker run -d -p 3000:3000/tcp us-east1-docker.pkg.dev/miscellaneous-429614/misc/um-device-tracker
```
y tenemos un contenedor de docker listo!


### ¿Ahora qué? 

El siguiente paso mas obvio sería adquirir un dominio y hacer que ese dominio redigirá
a nuestra aplicación con algo como nginx

```bash
sudo apt install nginx
```

y en /etc/nginx/sites-available creamos un archivo de configuración
como:

```nginx
server {
    server_name DOMAIN.COM;

    location / {
        proxy_pass http://localhost:APP_PORT;
        proxy_set_header Host $host; # Forwarded host
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_redirect off;
 # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }


    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/DOMAIN.COM/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN.COM/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}

server {
    listen 80;

    server_name DOMAIN.COM;

    return 301 https://$host$request_uri;
}

```
Luego logramos habilitarlo al hacer un symlink desde el directorio /etc/nginx/sites-enabled

```bash
sudo ln -s /etc/nginx/sites-available/[filename] /etc/nginx/sites-enabled/
```

El despliegue y mantenimiento de infraestructura de aplicaciones es un mundo amplio
y hay muchas razones porque esta configuración no seria muy optima en ciertos aspectos
como lo es el tiempo fuera de servicio al desplegar una versión nueva.

El proceso en si es muy sencillo ya que solo seria volver a jalar la imagen y correr otro contenedor
pero el despliegue a escala tiende a ser mucho mas complejo y ahi es donde la contenedorización brilla

A continuación hay una lista de temas que son relevantes y que se pueden indagar mas a profundidad:

1. [Load Balancing](https://www.cloudflare.com/learning/performance/what-is-load-balancing/)
2. [Canary Deployments](https://cloud.google.com/deploy/docs/deployment-strategies/canary)
3. [Auto Scaling](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2009/EECS-2009-28.pdf)
4. [Kubernetes (K8s)](https://www.edx.org/learn/kubernetes/the-linux-foundation-introduction-to-kubernetes)
