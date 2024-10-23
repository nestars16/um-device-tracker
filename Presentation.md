<style>
    code {
        font-family: 'Iosevka Web' !important;
    }
</style>


# Despliege y contenedorización de applicaciones web con Docker


![width:150px](https://upload.wikimedia.org/wikipedia/commons/d/d5/Rust_programming_language_black_logo.svg)
![bg left:30% 90%](https://miro.medium.com/v2/resize:fit:601/0*1XzkA-KeQkc2ugix.png)

---

# Nuestra aplicación

Antes de empezar y poder demostrar nuestro primer metodó
de despliegue hay que introducir nuestro ejemplo, que consiste
de un servidor web escrito en un lenguaje compilado (Rust) que 
se encarga de las solicitudes a una aplicación de una pagina (SPA)
que es accedida a través de el servidor web.

Esto nos deja saber que hay 3 elementos principales, nuestro ejecutable, los archivos `js`,`html` y `css` al igual que nuestro ambiente

---

# Solo archivos

Esto es todo lo que nuestra aplicación necesitará para desplegar

```bash
./ # <--- Root directory
├── static
│   ├── assets
│   │   ├── index-{content-hash}.js
│   │   └── index-{content-hash}.css
│   └── index.html
├── um-device-tracker
```

👍

---

# Generando los archivos

Antes de empezar vamos a generar los archivos necesarios.
Para eso hay unos requisitos:

- El codigo fuente
https://github.com/nestars16/um-device-tracker/tree/main

- Cargo, el sistema de compilación de Rust
https://www.rust-lang.org/tools/install

- Un motor de ejecución de Javascript (Node)
https://nodejs.org/en/download/prebuilt-binaries

---

# El ejecutable

```bash
cargo build --release
```
```bash
.
├── static
│   ├── assets
│   │   ├── index-{content-hash}.js
│   │   └── index-{content-hash}.css
│   └── index.html
├── target
   └── release
       └── um-device-tracker # 👈---------- Aquí Nuestro ejecutable

```

---

# Archivos estáticos

```bash
cd frontend && npm run build
```

```bash

├── components.json
├── dist   # 👈------------------------------------------ este folder se vuelve el folder static
│   ├── assets
│   │   ├── index-{content-hash}.js   # 👈---- Todo se mantiene igual 
│   │   └── index-{content-hash}.css  # 👈---- Todo se mantiene igual 
│   └── index.html                    # 👈---- Todo se mantiene igual 

```
---

# Despliegue


Para esto ocuparemos un servicio de servidores virtuales llamado Hetzner, iremos a [su sitio web](https://console.hetzner.cloud/projects)
y crearemos nuestro proyecto, con las especificaciones deseadas

Para acceder el servidor de una forma mas ergonómica utilizaremos `ssh` y para permitirnos acceso al servidor
tenemos que proveer nuestra llave pública que en linux se encuentra en `~/.ssh/` y en nuestro caso
donde `~` es el directorio principal de el usuario


---

# Nuestras credenciales


```bash
#tree ~/.ssh 👈---- Corrimos este commando
~/.ssh/
├── id_rsa
├── id_rsa.pub
├── known_hosts
└── known_hosts.old

```bash
⮞  cat ~/.ssh/id_rsa.pub
ssh-rsa /* BASE64 ENCODED KEY*/ nesmb16@gmail.com
```

Necesitaremos esto para ingresar a nuestro servidor

---

# Acceso

```bash
ssh root@$SERVER_IP
useradd -m $USERNAME # la bandera -m es tal que crea un directorio para el usuario
usermod -aG sudo $USERNAME # Este comando nos dará acceso al comando de `sudo` para poder realizar comandos con privilegios elevados
passwd $USERNAME
# Los comandos siguientes se utilizan para poder ingresar con ssh a nuestro usuario
sudo mkdir -p /home/$USERNAME/.ssh # Creamos un directorio para los credenciales ssh
sudo chmod 700 /home/$USERNAME/.ssh # le damos permisos a nuestro usuario
sudo chown $USERNAME:$USERNAME /home/$USERNAME/.ssh # transferimos propiedad de el directorio
sudo cp /root/.ssh/authorized_keys /home/$USERNAME/.ssh/ # Copiamos las credenciales de la cuenta
sudo chown $USERNAME:$USERNAME /home/$USERNAME/.ssh/authorized_keys # Transferimos el dueño a nuestro usuario
sudo chmod 600 /home/$USERNAME/.ssh/authorized_keys # le damos solo al dueño permisos de lectura y edición
```
Ahora podemos salir y entrar con nuestro usuario creado

```bash
exit
ssh $USERNAME@$SERVER_IP
```

---

# Seguridad

Ahora podemos deshabilitar ingreso con root, tendremos que editar el archivo `/etc/ssh/sshd_config`

```bash
sudo vim /etc/ssh/sshd_config # Pedira una contraseña
```
```
- PermitRootLogin yes
+ PermitRootLogin no
- PasswordAuthentication no
+ PasswordAuthentication yes
```
```bash
sudo systemctl restart ssh
```

---
# Desplegando archivos

```bash
rm -rf static/*  #👈------- Esto elimina los archivos existentes en el folder static para no causar colisiones
cd frontend && npm run build #👈---- generamos nuestros archivos estaticos
mv frontend/dist/* static # 👈---- Los movemos a nuestro directorio de static
cargo build --release #👈----- Compilamos nuestro binario

scp target/release/um-device-tracker nestor@$SERVER_IP:um-device-tracker # 👈----- Utilizamos ssh para copiar los archivos en el servidor
scp -r static nestor@$SERVER_IP:um-device-tracker #👈----- Utilizamos ssh para copiar los archivos en el servidor
scp .env nestor@$SERVER_IP:um-device-tracker # Copiamos nuestras credenciales a nuestro servidor para ser leidos por la imagen

nohup um-device-tracker/um-device-tracker & # Correr la aplicación
```
---

<!-- _class : lead -->

# Porqué hacer algo diferente a eso?

---


# Consideraciones

- Que pasá si estamos desplegando a 5 servidores a la vez? Repetiremos el proceso por cada uno?
- Que tan reproducible es este proceso que acabamos de hacer?

**Lenguajes Interpretados** 

- Tener que instalar interpretadores o ambientes de ejecución si nuestro lenguaje dependiera de ellos (Python, Java, Ruby...)
- Asegurarse que nuestras dependencias y paquetes esten instalados en el servidor y que sean las versiones compatibles con nuestro codigo

---

# Consideraciones 

## Lenguajes Compilados

- Nosotros enlazamos nuestro ejecutable de forma estática, sin embargo hay muchos casos donde se prefiere enlazado dinámico a través de archivos `.dll` o `.so`, lo cual tambien implica siempre asegurarse que esas librerias sean una versión compatible

- Que tal si tenemos dos servidores corriendo arquitecturas `x86_64` y tres corriendo `ARM`? Como manejaremos cruz-compilar para estas arquitecturas de forma eficiente, si no tenemos un sistema de compilación como `cargo` y solo estamos trabajando `CMake` o `make`

---

# Aquí entra Docker

Una plataforma de software que nos permite "Contenedorizar" aplicaciones.

Es decir, agrupar todo lo que nuestra aplicación necesita para correr en un solo lugar
sin necesidad de instalar nada mas que no sea Docker

![bg left:45% 90%](https://www.docker.com/wp-content/uploads/2021/11/container-what-is-container.png)

---

# Contenedorizemos nuestra aplicación

El primer paso para esto, es definir una "imagen" para nuestra aplicación esto se hace a través de archivos con una sintaxis especial llamados `Dockerfile`s

Las imagenes son como una receta para crear tu aplicación, una receta que Docker puede utilizar para crear un contenedor, lo cual es una "instancia" de tu imagen

---

# Nuestra imagen

```Dockerfile

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
```
---

```Dockerfile

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


```

---
```Dockerfile

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


---

Con esto podemos crear nuestra imagen y poder subirla a un repositorio de artefactos para poder descargarla facilmente
desde nuestro servidor

Para crear y subir nuestra imagen correremos, esto necesitará que estemos autenticados a una cuenta de google via la cli de gcloud

```bash
docker build --build-arg DATABASE_URL=$DATABASE_URL -t us-east1-docker.pkg.dev/miscellaneous-429614/misc/um-device-tracker .
docker push us-east1-docker.pkg.dev/miscellaneous-429614/misc/um-device-tracker
```
Y en nuestro servidor

```bash
docker pull us-east1-docker.pkg.dev/miscellaneous-429614/misc/um-device-tracker
```
---

y para correrlo

```bash
docker run -d -p 3000:3000/tcp us-east1-docker.pkg.dev/miscellaneous-429614/misc/um-device-tracker
```

y tenemos un contenedor de docker listo!

---

