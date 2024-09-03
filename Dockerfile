FROM node:12-alpine

RUN apk --no-cache add \
      ca-certificates \
      fuse

# Allow access to volume by different user to enable UIDs other than root when using volumes
RUN echo user_allow_other >> /etc/fuse.conf

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY ./package.json .
RUN yarn
COPY ./ .

RUN mkdir -p /data
VOLUME /data

EXPOSE 8008
CMD [ "node", "./bin/file-server"]
