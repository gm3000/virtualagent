FROM ${docker.registry}/${docker.image.base.name}:${docker.image.base.version}
MAINTAINER ${project.maintainer}

LABEL ${project.vendor.label} = ${project.vendor}
LABEL ${project.release.date.label} = ${maven.build.timestamp}
LABEL ${project.release.version.label} = ${default.tag}

# install Nodejs 8.9.4
RUN mkdir /app \
 && curl -sS -L https://nodejs.org/dist/latest-v8.x/node-v8.9.4-linux-x64.tar.gz -o /app/node-v8.9.4-linux-x64.tar.gz \
 && tar -zxf /app/node-v8.9.4-linux-x64.tar.gz -C /app \
 && rm -rf /app/node-v8.9.4-linux-x64.tar.gz

# install git
RUN zypper install -y git

ENV NODE_HOME /app/node-v8.9.4-linux-x64/bin
ENV PATH $NODE_HOME:$PATH

ADD ./nodejs /home/daemon

WORKDIR /home/daemon

RUN npm install

EXPOSE ${docker.server.port} 8090

CMD [ "sh", "/home/daemon/startBotEngine.sh" ]