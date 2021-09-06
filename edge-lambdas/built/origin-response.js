'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var require$$0$2 = require('url');
var require$$0 = require('net');
var require$$0$1 = require('dgram');
var require$$0$3 = require('http');
var require$$4 = require('os');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var require$$0__default$2 = /*#__PURE__*/_interopDefaultLegacy(require$$0$2);
var require$$0__default = /*#__PURE__*/_interopDefaultLegacy(require$$0);
var require$$0__default$1 = /*#__PURE__*/_interopDefaultLegacy(require$$0$1);
var require$$0__default$3 = /*#__PURE__*/_interopDefaultLegacy(require$$0$3);
var require$$4__default = /*#__PURE__*/_interopDefaultLegacy(require$$4);

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var lib = {};

var MetricsLogger$1 = {};

var Configuration$1 = {};

var EnvironmentConfigurationProvider$1 = {};

var Constants = {};

(function (exports) {
/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
(function (Constants) {
    Constants[Constants["MAX_DIMENSIONS"] = 9] = "MAX_DIMENSIONS";
    Constants["DEFAULT_NAMESPACE"] = "aws-embedded-metrics";
    Constants[Constants["MAX_METRICS_PER_EVENT"] = 100] = "MAX_METRICS_PER_EVENT";
    Constants["DEFAULT_AGENT_HOST"] = "0.0.0.0";
    Constants[Constants["DEFAULT_AGENT_PORT"] = 25888] = "DEFAULT_AGENT_PORT";
})(exports.Constants || (exports.Constants = {}));
}(Constants));

var Environments$1 = {};

Object.defineProperty(Environments$1, "__esModule", { value: true });
var Environments;
(function (Environments) {
    Environments["Local"] = "Local";
    Environments["Lambda"] = "Lambda";
    Environments["Agent"] = "Agent";
    Environments["EC2"] = "EC2";
    Environments["ECS"] = "ECS";
    Environments["Unknown"] = "";
})(Environments || (Environments = {}));
Environments$1.default = Environments;

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(EnvironmentConfigurationProvider$1, "__esModule", { value: true });
const Constants_1$2 = Constants;
const Environments_1$1 = Environments$1;
const ENV_VAR_PREFIX = 'AWS_EMF';
var ConfigKeys;
(function (ConfigKeys) {
    ConfigKeys["LOG_GROUP_NAME"] = "LOG_GROUP_NAME";
    ConfigKeys["LOG_STREAM_NAME"] = "LOG_STREAM_NAME";
    ConfigKeys["ENABLE_DEBUG_LOGGING"] = "ENABLE_DEBUG_LOGGING";
    ConfigKeys["SERVICE_NAME"] = "SERVICE_NAME";
    ConfigKeys["SERVICE_TYPE"] = "SERVICE_TYPE";
    ConfigKeys["AGENT_ENDPOINT"] = "AGENT_ENDPOINT";
    ConfigKeys["ENVIRONMENT_OVERRIDE"] = "ENVIRONMENT";
    ConfigKeys["NAMESPACE"] = "NAMESPACE";
})(ConfigKeys || (ConfigKeys = {}));
class EnvironmentConfigurationProvider {
    getConfiguration() {
        return {
            agentEndpoint: this.getEnvVariable(ConfigKeys.AGENT_ENDPOINT),
            debuggingLoggingEnabled: this.tryGetEnvVariableAsBoolean(ConfigKeys.ENABLE_DEBUG_LOGGING, false),
            logGroupName: this.getEnvVariable(ConfigKeys.LOG_GROUP_NAME),
            logStreamName: this.getEnvVariable(ConfigKeys.LOG_STREAM_NAME),
            serviceName: this.getEnvVariable(ConfigKeys.SERVICE_NAME) || this.getEnvVariableWithoutPrefix(ConfigKeys.SERVICE_NAME),
            serviceType: this.getEnvVariable(ConfigKeys.SERVICE_TYPE) || this.getEnvVariableWithoutPrefix(ConfigKeys.SERVICE_TYPE),
            environmentOverride: this.getEnvironmentOverride(),
            namespace: this.getEnvVariable(ConfigKeys.NAMESPACE) || Constants_1$2.Constants.DEFAULT_NAMESPACE,
        };
    }
    getEnvVariableWithoutPrefix(configKey) {
        return process.env[configKey];
    }
    getEnvVariable(configKey) {
        return process.env[`${ENV_VAR_PREFIX}_${configKey}`];
    }
    tryGetEnvVariableAsBoolean(configKey, fallback) {
        const configValue = this.getEnvVariable(configKey);
        return !configValue ? fallback : configValue.toLowerCase() === 'true';
    }
    getEnvironmentOverride() {
        const overrideValue = this.getEnvVariable(ConfigKeys.ENVIRONMENT_OVERRIDE);
        const environment = Environments_1$1.default[overrideValue];
        if (environment === undefined) {
            return Environments_1$1.default.Unknown;
        }
        return environment;
    }
}
EnvironmentConfigurationProvider$1.EnvironmentConfigurationProvider = EnvironmentConfigurationProvider;

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(Configuration$1, "__esModule", { value: true });
const EnvironmentConfigurationProvider_1 = EnvironmentConfigurationProvider$1;
const Configuration = new EnvironmentConfigurationProvider_1.EnvironmentConfigurationProvider().getConfiguration();
Configuration$1.default = Configuration;

var MetricsContext$1 = {};

var Logger = {};

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(Logger, "__esModule", { value: true });
const Configuration_1$9 = Configuration$1;
const LOG = (...args) => {
    if (Configuration_1$9.default.debuggingLoggingEnabled) {
        console.log(...args);
    }
};
Logger.LOG = LOG;

var MetricValues$1 = {};

Object.defineProperty(MetricValues$1, "__esModule", { value: true });
/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class MetricValues {
    constructor(value, unit) {
        this.values = [value];
        this.unit = unit || 'None';
    }
    /**
     * Appends the provided value to the current metric
     * @param value
     */
    addValue(value) {
        this.values.push(value);
    }
}
MetricValues$1.MetricValues = MetricValues;

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(MetricsContext$1, "__esModule", { value: true });
const Configuration_1$8 = Configuration$1;
const Logger_1$9 = Logger;
const MetricValues_1 = MetricValues$1;
class MetricsContext {
    /**
     * Constructor used to create child instances.
     * You should not use this constructor directly.
     * Instead, use createCopyWithContext() or empty().
     *
     * The reason for this is to avoid unexpected behavior when creating
     * MetricsContexts with defaultDimensions and existing dimensions.
     *
     * @param properties
     * @param dimensions
     */
    constructor(namespace, properties, dimensions, defaultDimensions, shouldUseDefaultDimensions, timestamp) {
        this.metrics = new Map();
        this.meta = {};
        this.shouldUseDefaultDimensions = true;
        this.namespace = namespace || Configuration_1$8.default.namespace;
        this.properties = properties || {};
        this.dimensions = dimensions || [];
        this.timestamp = timestamp;
        this.meta.Timestamp = MetricsContext.resolveMetaTimestamp(timestamp);
        this.defaultDimensions = defaultDimensions || {};
        if (shouldUseDefaultDimensions != undefined) {
            this.shouldUseDefaultDimensions = shouldUseDefaultDimensions;
        }
    }
    /**
     * Use this to create a new, empty context.
     */
    static empty() {
        return new MetricsContext();
    }
    static resolveMetaTimestamp(timestamp) {
        if (timestamp instanceof Date) {
            return timestamp.getTime();
        }
        else if (timestamp) {
            return timestamp;
        }
        else {
            return Date.now();
        }
    }
    setNamespace(value) {
        this.namespace = value;
    }
    setProperty(key, value) {
        this.properties[key] = value;
    }
    setTimestamp(timestamp) {
        this.timestamp = timestamp;
        this.meta.Timestamp = MetricsContext.resolveMetaTimestamp(timestamp);
    }
    /**
     * Sets default dimensions for the Context.
     * A dimension set will be created with just the default dimensions
     * and all calls to putDimensions will be prepended with the defaults.
     */
    setDefaultDimensions(dimensions) {
        Logger_1$9.LOG(`Received default dimensions`, dimensions);
        this.defaultDimensions = dimensions;
    }
    /**
     * Adds a new set of dimensions. Any time a new dimensions set
     * is added, the set is first prepended by the default dimensions.
     *
     * @param dimensions
     */
    putDimensions(incomingDimensionSet) {
        if (this.dimensions.length === 0) {
            this.dimensions.push(incomingDimensionSet);
            return;
        }
        for (let i = 0; i < this.dimensions.length; i++) {
            const existingDimensionSet = this.dimensions[i];
            // check for duplicate dimensions when putting
            // this is an O(n^2) operation, but since we never expect to have more than
            // 10 dimensions, this is acceptable for almost all cases.
            // This makes re-using loggers much easier.
            const existingDimensionSetKeys = Object.keys(existingDimensionSet);
            const incomingDimensionSetKeys = Object.keys(incomingDimensionSet);
            if (existingDimensionSetKeys.length !== incomingDimensionSetKeys.length) {
                this.dimensions.push(incomingDimensionSet);
                return;
            }
            for (let j = 0; j < existingDimensionSetKeys.length; j++) {
                if (!incomingDimensionSetKeys.includes(existingDimensionSetKeys[j])) {
                    // we're done now because we know that the dimensions keys are not identical
                    this.dimensions.push(incomingDimensionSet);
                    return;
                }
            }
        }
    }
    /**
     * Overwrite all dimensions.
     *
     * @param dimensionSets
     */
    setDimensions(dimensionSets) {
        this.shouldUseDefaultDimensions = false;
        this.dimensions = dimensionSets;
    }
    /**
     * Get the current dimensions.
     */
    getDimensions() {
        // caller has explicitly called setDimensions
        if (this.shouldUseDefaultDimensions === false) {
            return this.dimensions;
        }
        // if there are no default dimensions, return the custom dimensions
        if (Object.keys(this.defaultDimensions).length === 0) {
            return this.dimensions;
        }
        // if default dimensions have been provided, but no custom dimensions, use the defaults
        if (this.dimensions.length === 0) {
            return [this.defaultDimensions];
        }
        // otherwise, merge the dimensions
        // we do this on the read path because default dimensions
        // may get updated asynchronously by environment detection
        return this.dimensions.map(custom => {
            return Object.assign(Object.assign({}, this.defaultDimensions), custom);
        });
    }
    putMetric(key, value, unit) {
        const currentMetric = this.metrics.get(key);
        if (currentMetric) {
            currentMetric.addValue(value);
        }
        else {
            this.metrics.set(key, new MetricValues_1.MetricValues(value, unit));
        }
    }
    /**
     * Creates an independently flushable context.
     */
    createCopyWithContext() {
        return new MetricsContext(this.namespace, Object.assign({}, this.properties), Object.assign([], this.dimensions), this.defaultDimensions, this.shouldUseDefaultDimensions, this.timestamp);
    }
}
MetricsContext$1.MetricsContext = MetricsContext;

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __awaiter$7 = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(MetricsLogger$1, "__esModule", { value: true });
const Configuration_1$7 = Configuration$1;
const MetricsContext_1$1 = MetricsContext$1;
/**
 * An async metrics logger.
 * Use this interface to publish logs to CloudWatch Logs
 * and extract metrics to CloudWatch Metrics asynchronously.
 */
class MetricsLogger {
    constructor(resolveEnvironment, context) {
        this.configureContextForEnvironment = (context, environment) => {
            const defaultDimensions = {
                // LogGroup name will entirely depend on the environment since there
                // are some cases where the LogGroup cannot be configured (e.g. Lambda)
                LogGroup: environment.getLogGroupName(),
                ServiceName: Configuration_1$7.default.serviceName || environment.getName(),
                ServiceType: Configuration_1$7.default.serviceType || environment.getType(),
            };
            context.setDefaultDimensions(defaultDimensions);
            environment.configureContext(context);
        };
        this.resolveEnvironment = resolveEnvironment;
        this.context = context || MetricsContext_1$1.MetricsContext.empty();
    }
    /**
     * Flushes the current context state to the configured sink.
     */
    flush() {
        return __awaiter$7(this, void 0, void 0, function* () {
            // resolve the environment and get the sink
            // MOST of the time this will run synchonrously
            // This only runs asynchronously if executing for the
            // first time in a non-lambda environment
            const environment = yield this.resolveEnvironment();
            this.configureContextForEnvironment(this.context, environment);
            const sink = environment.getSink();
            // accept and reset the context
            yield sink.accept(this.context);
            this.context = this.context.createCopyWithContext();
        });
    }
    /**
     * Set a property on the published metrics.
     * This is stored in the emitted log data and you are not
     * charged for this data by CloudWatch Metrics.
     * These values can be values that are useful for searching on,
     * but have too high cardinality to emit as dimensions to
     * CloudWatch Metrics.
     *
     * @param key Property name
     * @param value Property value
     */
    setProperty(key, value) {
        this.context.setProperty(key, value);
        return this;
    }
    /**
     * Adds a dimension.
     * This is generally a low cardinality key-value pair that is part of the metric identity.
     * CloudWatch treats each unique combination of dimensions as a separate metric, even if the metrics have the same metric name.
     *
     * @param dimension
     * @param value
     * @see [CloudWatch Dimensions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#Dimension)
     */
    putDimensions(dimensions) {
        this.context.putDimensions(dimensions);
        return this;
    }
    /**
     * Overwrite all dimensions on this MetricsLogger instance.
     *
     * @param dimensionSets
     * @see [CloudWatch Dimensions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#Dimension)
     */
    setDimensions(...dimensionSets) {
        this.context.setDimensions(dimensionSets);
        return this;
    }
    /**
     * Put a metric value.
     * This value will be emitted to CloudWatch Metrics asyncronously and does not contribute to your
     * account TPS limits. The value will also be available in your CloudWatch Logs
     * @param key
     * @param value
     * @param unit
     */
    putMetric(key, value, unit) {
        this.context.putMetric(key, value, unit);
        return this;
    }
    /**
     * Set the CloudWatch namespace that metrics should be published to.
     * @param value
     */
    setNamespace(value) {
        this.context.setNamespace(value);
        return this;
    }
    /**
     * Set the timestamp of metrics emitted in this context.
     *
     * If not set, the timestamp will default to new Date() at the point
     * the context is constructed.
     *
     * If set, timestamp will preserved across calls to flush().
     *
     * @param timestamp
     */
    setTimestamp(timestamp) {
        this.context.setTimestamp(timestamp);
        return this;
    }
    /**
     * Creates a new logger using the same contextual data as
     * the previous logger. This allows you to flush the instances
     * independently.
     */
    new() {
        return new MetricsLogger(this.resolveEnvironment, this.context.createCopyWithContext());
    }
}
MetricsLogger$1.MetricsLogger = MetricsLogger;

var ConsoleSink$1 = {};

var LogSerializer$1 = {};

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(LogSerializer$1, "__esModule", { value: true });
const Constants_1$1 = Constants;
/**
 * Serializes the provided context to the CWL Structured
 * Logs format with Embedded Metric Filters.
 */
class LogSerializer {
    /**
     * Retrieve the current context as a JSON string
     */
    serialize(context) {
        const dimensionKeys = [];
        let dimensionProperties = {};
        context.getDimensions().forEach(d => {
            // we can only take the first 9 defined dimensions
            // the reason we do this in the serializer is because
            // it is possible that other sinks or formats can
            // support more dimensions
            // in the future it may make sense to introduce a higher-order
            // representation for sink-specific validations
            const keys = Object.keys(d).slice(0, Constants_1$1.Constants.MAX_DIMENSIONS);
            dimensionKeys.push(keys);
            dimensionProperties = Object.assign(Object.assign({}, dimensionProperties), d);
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createBody = () => {
            return Object.assign(Object.assign(Object.assign({}, dimensionProperties), context.properties), { _aws: Object.assign(Object.assign({}, context.meta), { CloudWatchMetrics: [
                        {
                            Dimensions: dimensionKeys,
                            Metrics: [],
                            Namespace: context.namespace,
                        },
                    ] }) });
        };
        const eventBatches = [];
        let currentBody = createBody();
        const currentMetricsInBody = () => currentBody._aws.CloudWatchMetrics[0].Metrics.length;
        const shouldSerialize = () => currentMetricsInBody() === Constants_1$1.Constants.MAX_METRICS_PER_EVENT;
        // converts the body to JSON and pushes it into the batches
        const serializeCurrentBody = () => {
            eventBatches.push(JSON.stringify(currentBody));
            currentBody = createBody();
        };
        for (const [key, metric] of context.metrics) {
            // if there is only one metric value, unwrap it to make querying easier
            const metricValue = metric.values.length === 1 ? metric.values[0] : metric.values;
            currentBody[key] = metricValue;
            currentBody._aws.CloudWatchMetrics[0].Metrics.push({ Name: key, Unit: metric.unit });
            if (shouldSerialize()) {
                serializeCurrentBody();
            }
        }
        if (eventBatches.length === 0 || currentMetricsInBody() > 0) {
            serializeCurrentBody();
        }
        return eventBatches;
    }
}
LogSerializer$1.LogSerializer = LogSerializer;

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(ConsoleSink$1, "__esModule", { value: true });
const LogSerializer_1$1 = LogSerializer$1;
/**
 * A sink that flushes log data to stdout.
 * This is the preferred sink for Lambda functions.
 */
class ConsoleSink {
    constructor(serializer) {
        this.name = 'ConsoleSink';
        this.serializer = serializer || new LogSerializer_1$1.LogSerializer();
    }
    accept(context) {
        // tslint:disable-next-line
        const events = this.serializer.serialize(context);
        events.forEach(event => console.log(event));
        return Promise.resolve();
    }
}
ConsoleSink$1.ConsoleSink = ConsoleSink;

var AgentSink$1 = {};

var TcpClient$1 = {};

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __awaiter$6 = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(TcpClient$1, "__esModule", { value: true });
const net = require$$0__default['default'];
const Logger_1$8 = Logger;
class TcpClient {
    constructor(endpoint) {
        this.endpoint = endpoint;
        this.socket = new net.Socket({ allowHalfOpen: true, writable: false })
            .setEncoding('utf8')
            .setKeepAlive(true)
            .setTimeout(5000) // idle timeout
            .on('timeout', () => this.disconnect('idle timeout'))
            .on('end', () => this.disconnect('end'))
            .on('data', data => Logger_1$8.LOG('TcpClient received data.', data));
    }
    warmup() {
        return __awaiter$6(this, void 0, void 0, function* () {
            try {
                yield this.establishConnection();
            }
            catch (err) {
                Logger_1$8.LOG('Failed to connect', err);
            }
        });
    }
    sendMessage(message) {
        return __awaiter$6(this, void 0, void 0, function* () {
            // ensure the socket is open and writable
            yield this.waitForOpenConnection();
            yield new Promise((resolve, reject) => {
                const onSendError = (err) => {
                    Logger_1$8.LOG('Failed to write', err);
                    reject(err);
                };
                const wasFlushedToKernel = this.socket.write(message, (err) => {
                    if (!err) {
                        Logger_1$8.LOG('Write succeeded');
                        resolve();
                    }
                    else {
                        onSendError(err);
                    }
                });
                if (!wasFlushedToKernel) {
                    Logger_1$8.LOG('TcpClient data was not flushed to kernel buffer and was queued in memory.');
                }
            });
        });
    }
    disconnect(eventName) {
        Logger_1$8.LOG('TcpClient disconnected due to:', eventName);
        this.socket.removeAllListeners();
        this.socket.destroy();
        this.socket.unref();
    }
    waitForOpenConnection() {
        return __awaiter$6(this, void 0, void 0, function* () {
            if (!this.socket.writeable || this.socket.readyState !== 'open') {
                yield this.establishConnection();
            }
        });
    }
    establishConnection() {
        return __awaiter$6(this, void 0, void 0, function* () {
            yield new Promise((resolve, reject) => {
                const onError = (e) => {
                    // socket is already open, no need to connect
                    if (e.message.includes('EISCONN')) {
                        resolve();
                        return;
                    }
                    Logger_1$8.LOG('TCP Client received error', e);
                    this.disconnect(e.message);
                    reject(e);
                };
                const onConnect = () => {
                    this.socket.removeListener('error', onError);
                    Logger_1$8.LOG('TcpClient connected.', this.endpoint);
                    resolve();
                };
                // TODO: convert this to a proper state machine
                switch (this.socket.readyState) {
                    case 'open':
                        resolve();
                        break;
                    case 'opening':
                        // the socket is currently opening, we will resolve
                        // or fail the current promise on the connect or
                        // error events
                        this.socket.once('connect', onConnect);
                        this.socket.once('error', onError);
                        break;
                    default:
                        Logger_1$8.LOG('opening connection with socket in state: ', this.socket.readyState);
                        this.socket.connect(this.endpoint.port, this.endpoint.host, onConnect).once('error', onError);
                        break;
                }
            });
        });
    }
}
TcpClient$1.TcpClient = TcpClient;

var UdpClient$1 = {};

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __awaiter$5 = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(UdpClient$1, "__esModule", { value: true });
const dgram = require$$0__default$1['default'];
const Logger_1$7 = Logger;
class UdpClient {
    constructor(endpoint) {
        this.endpoint = endpoint;
    }
    // No warm up for UDP
    warmup() {
        return Promise.resolve();
    }
    sendMessage(message) {
        return __awaiter$5(this, void 0, void 0, function* () {
            const client = dgram.createSocket('udp4');
            client.send(message, this.endpoint.port, this.endpoint.host, (error) => {
                if (error) {
                    Logger_1$7.LOG(error);
                }
                client.close();
            });
            return Promise.resolve();
        });
    }
}
UdpClient$1.UdpClient = UdpClient;

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __awaiter$4 = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(AgentSink$1, "__esModule", { value: true });
const url = require$$0__default$2['default'];
const Configuration_1$6 = Configuration$1;
const LogSerializer_1 = LogSerializer$1;
const Logger_1$6 = Logger;
const TcpClient_1 = TcpClient$1;
const UdpClient_1 = UdpClient$1;
const TCP = 'tcp:';
const UDP = 'udp:';
const defaultTcpEndpoint = {
    host: '0.0.0.0',
    port: 25888,
    protocol: TCP,
};
const parseEndpoint = (endpoint) => {
    try {
        if (!endpoint) {
            return defaultTcpEndpoint;
        }
        const parsedUrl = url.parse(endpoint);
        if (!parsedUrl.hostname || !parsedUrl.port || !parsedUrl.protocol) {
            Logger_1$6.LOG(`Failed to parse the provided agent endpoint. Falling back to the default TCP endpoint.`, parsedUrl);
            return defaultTcpEndpoint;
        }
        if (parsedUrl.protocol !== TCP && parsedUrl.protocol !== UDP) {
            Logger_1$6.LOG(`The provided agent endpoint protocol '${parsedUrl.protocol}' is not supported. Please use TCP or UDP. Falling back to the default TCP endpoint.`, parsedUrl);
            return defaultTcpEndpoint;
        }
        return {
            host: parsedUrl.hostname,
            port: Number(parsedUrl.port),
            protocol: parsedUrl.protocol,
        };
    }
    catch (e) {
        Logger_1$6.LOG('Failed to parse the provided agent endpoint', e);
        return defaultTcpEndpoint;
    }
};
/**
 * A sink that flushes to the CW Agent.
 * This sink instance should be re-used to avoid
 * leaking connections.
 */
class AgentSink {
    constructor(logGroupName, logStreamName, serializer) {
        this.name = 'AgentSink';
        this.logGroupName = logGroupName;
        this.logStreamName = logStreamName;
        this.serializer = serializer || new LogSerializer_1.LogSerializer();
        this.endpoint = parseEndpoint(Configuration_1$6.default.agentEndpoint);
        this.socketClient = this.getSocketClient(this.endpoint);
        Logger_1$6.LOG('Using socket client', this.socketClient.constructor.name);
    }
    accept(context) {
        return __awaiter$4(this, void 0, void 0, function* () {
            if (this.logGroupName) {
                context.meta.LogGroupName = this.logGroupName;
            }
            if (this.logStreamName) {
                context.meta.LogStreamName = this.logStreamName;
            }
            const events = this.serializer.serialize(context);
            Logger_1$6.LOG(`Sending {} events to socket.`, events.length);
            for (let index = 0; index < events.length; index++) {
                const event = events[index];
                const message = event + '\n';
                const bytes = Buffer.from(message);
                yield this.socketClient.sendMessage(bytes);
            }
        });
    }
    getSocketClient(endpoint) {
        Logger_1$6.LOG('Getting socket client for connection.', endpoint);
        const client = endpoint.protocol === TCP ? new TcpClient_1.TcpClient(endpoint) : new UdpClient_1.UdpClient(endpoint);
        client.warmup();
        return client;
    }
}
AgentSink$1.AgentSink = AgentSink;

var MetricScope = {};

var MetricsLoggerFactory = {};

var EnvironmentDetector = {};

var DefaultEnvironment$1 = {};

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(DefaultEnvironment$1, "__esModule", { value: true });
const Configuration_1$5 = Configuration$1;
const AgentSink_1$3 = AgentSink$1;
const Logger_1$5 = Logger;
class DefaultEnvironment {
    probe() {
        return Promise.resolve(true);
    }
    getName() {
        if (!Configuration_1$5.default.serviceName) {
            Logger_1$5.LOG('Unknown ServiceName.');
            return 'Unknown';
        }
        return Configuration_1$5.default.serviceName;
    }
    getType() {
        if (!Configuration_1$5.default.serviceType) {
            Logger_1$5.LOG('Unknown ServiceType.');
            return 'Unknown';
        }
        return Configuration_1$5.default.serviceType;
    }
    getLogGroupName() {
        // if the caller explicitly overrides logGroupName to
        // be empty, we should honor that rather than providing
        // the default behavior.
        if (Configuration_1$5.default.logGroupName === '') {
            return '';
        }
        return Configuration_1$5.default.logGroupName ? Configuration_1$5.default.logGroupName : `${this.getName()}-metrics`;
    }
    configureContext() {
        // no-op
    }
    getSink() {
        if (!this.sink) {
            this.sink = new AgentSink_1$3.AgentSink(this.getLogGroupName(), Configuration_1$5.default.logStreamName);
        }
        return this.sink;
    }
}
DefaultEnvironment$1.DefaultEnvironment = DefaultEnvironment;

var ECSEnvironment$1 = {};

var Fetch = {};

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(Fetch, "__esModule", { value: true });
const http = require$$0__default$3['default'];
const SOCKET_TIMEOUT = 1000;
/**
 * Fetch JSON data from an remote HTTP endpoint and de-serialize to the provided type.
 * There are no guarantees the response will conform to the contract defined by T.
 * It is up to the consumer to ensure the provided T captures all possible response types
 * from the provided endpoint.
 *
 * @param url - currently only supports HTTP
 */
const fetch = (url) => {
    return new Promise((resolve, reject) => {
        const request = http
            .get(url, { timeout: 2000 }, (response) => {
            if (!response.statusCode) {
                reject(`Received undefined response status code from '${url}'`);
                return;
            }
            if (response.statusCode < 200 || response.statusCode > 299) {
                reject(new Error('Failed to load page, status code: ' + response.statusCode));
                return;
            }
            // using similar approach to node-fetch
            // https://github.com/bitinn/node-fetch/blob/6a5d192034a0f438551dffb6d2d8df2c00921d16/src/body.js#L217
            const body = [];
            let bodyBytes = 0;
            response.on('data', (chunk) => {
                bodyBytes += chunk.length;
                body.push(chunk);
            });
            response.on('end', () => {
                let responseString;
                try {
                    const buffer = Buffer.concat(body, bodyBytes);
                    responseString = buffer.toString();
                    const parsedJson = JSON.parse(responseString);
                    resolve(parsedJson);
                }
                catch (e) {
                    reject(`Failed to parse response from '${url}' as JSON. Received: ${responseString}`);
                }
            });
        })
            .on('error', (err) => {
            reject(err);
        });
        request.on('socket', socket => {
            socket.on('timeout', () => {
                request.abort();
                reject(`Socket timeout while connecting to '${url}'`);
            });
            socket.setTimeout(SOCKET_TIMEOUT);
        });
    });
};
Fetch.fetch = fetch;

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __awaiter$3 = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(ECSEnvironment$1, "__esModule", { value: true });
const Configuration_1$4 = Configuration$1;
const AgentSink_1$2 = AgentSink$1;
const Fetch_1$1 = Fetch;
const Logger_1$4 = Logger;
const os = require$$4__default['default'];
const Constants_1 = Constants;
// formats image names into something more readable for a metric name
// e.g. <account-id>.dkr.ecr.<region>.amazonaws.com/<image-name>:latest -> <image-name>:latest
const formatImageName = (imageName) => {
    if (imageName) {
        const splitImageName = imageName.split('/');
        return splitImageName[splitImageName.length - 1];
    }
    return imageName;
};
class ECSEnvironment {
    probe() {
        return __awaiter$3(this, void 0, void 0, function* () {
            if (!process.env.ECS_CONTAINER_METADATA_URI) {
                return Promise.resolve(false);
            }
            if (process.env.FLUENT_HOST && !Configuration_1$4.default.agentEndpoint) {
                this.fluentBitEndpoint = `tcp://${process.env.FLUENT_HOST}:${Constants_1.Constants.DEFAULT_AGENT_PORT}`;
                Configuration_1$4.default.agentEndpoint = this.fluentBitEndpoint;
                Logger_1$4.LOG(`Using FluentBit configuration. Endpoint: ${this.fluentBitEndpoint}`);
            }
            try {
                this.metadata = yield Fetch_1$1.fetch(process.env.ECS_CONTAINER_METADATA_URI);
                if (this.metadata) {
                    this.metadata.FormattedImageName = formatImageName(this.metadata.Image);
                    Logger_1$4.LOG(`Successfully collected ECS Container metadata.`);
                }
            }
            catch (e) {
                Logger_1$4.LOG('Failed to collect ECS Container Metadata.');
                Logger_1$4.LOG(e);
            }
            // return true regardless of whether or not metadata collection
            // succeeded. we know that this is supposed to be an ECS environment
            // just from the environment variable
            return true;
        });
    }
    getName() {
        var _a;
        if (Configuration_1$4.default.serviceName) {
            return Configuration_1$4.default.serviceName;
        }
        return ((_a = this.metadata) === null || _a === void 0 ? void 0 : _a.FormattedImageName) ? this.metadata.FormattedImageName : 'Unknown';
    }
    getType() {
        return 'AWS::ECS::Container';
    }
    getLogGroupName() {
        // FireLens / fluent-bit does not need the log group to be included
        // since configuration of the LogGroup is handled by the
        // fluent bit config file
        if (this.fluentBitEndpoint) {
            return '';
        }
        return Configuration_1$4.default.logGroupName || this.getName();
    }
    configureContext(context) {
        var _a, _b, _c, _d, _e;
        this.addProperty(context, 'containerId', os.hostname());
        this.addProperty(context, 'createdAt', (_a = this.metadata) === null || _a === void 0 ? void 0 : _a.CreatedAt);
        this.addProperty(context, 'startedAt', (_b = this.metadata) === null || _b === void 0 ? void 0 : _b.StartedAt);
        this.addProperty(context, 'image', (_c = this.metadata) === null || _c === void 0 ? void 0 : _c.Image);
        this.addProperty(context, 'cluster', (_d = this.metadata) === null || _d === void 0 ? void 0 : _d.Labels['com.amazonaws.ecs.cluster']);
        this.addProperty(context, 'taskArn', (_e = this.metadata) === null || _e === void 0 ? void 0 : _e.Labels['com.amazonaws.ecs.task-arn']);
        // we override the standard default dimensions here because in the
        // FireLens / fluent-bit case, we don't need the LogGroup
        if (this.fluentBitEndpoint) {
            context.setDefaultDimensions({
                ServiceName: Configuration_1$4.default.serviceName || this.getName(),
                ServiceType: Configuration_1$4.default.serviceType || this.getType(),
            });
        }
    }
    getSink() {
        if (!this.sink) {
            const logGroupName = this.fluentBitEndpoint ? '' : this.getLogGroupName();
            this.sink = new AgentSink_1$2.AgentSink(logGroupName);
        }
        return this.sink;
    }
    addProperty(context, key, value) {
        if (value) {
            context.setProperty(key, value);
        }
    }
}
ECSEnvironment$1.ECSEnvironment = ECSEnvironment;

var EC2Environment$1 = {};

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __awaiter$2 = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(EC2Environment$1, "__esModule", { value: true });
const Configuration_1$3 = Configuration$1;
const AgentSink_1$1 = AgentSink$1;
const Fetch_1 = Fetch;
const Logger_1$3 = Logger;
const endpoint = 'http://169.254.169.254/latest/dynamic/instance-identity/document';
class EC2Environment {
    probe() {
        return __awaiter$2(this, void 0, void 0, function* () {
            try {
                this.metadata = yield Fetch_1.fetch(endpoint);
                if (this.metadata) {
                    return true;
                }
                return false;
            }
            catch (e) {
                Logger_1$3.LOG(e);
                return false;
            }
        });
    }
    getName() {
        if (!Configuration_1$3.default.serviceName) {
            Logger_1$3.LOG('Unknown ServiceName.');
            return 'Unknown';
        }
        return Configuration_1$3.default.serviceName;
    }
    getType() {
        if (this.metadata) {
            return 'AWS::EC2::Instance';
        }
        // this will only happen if probe() is not called first
        return 'Unknown';
    }
    getLogGroupName() {
        return Configuration_1$3.default.logGroupName ? Configuration_1$3.default.logGroupName : `${this.getName()}-metrics`;
    }
    configureContext(context) {
        if (this.metadata) {
            context.setProperty('imageId', this.metadata.imageId);
            context.setProperty('instanceId', this.metadata.instanceId);
            context.setProperty('instanceType', this.metadata.instanceType);
            context.setProperty('privateIP', this.metadata.privateIp);
            context.setProperty('availabilityZone', this.metadata.availabilityZone);
        }
    }
    getSink() {
        if (!this.sink) {
            this.sink = new AgentSink_1$1.AgentSink(this.getLogGroupName(), Configuration_1$3.default.logStreamName);
        }
        return this.sink;
    }
}
EC2Environment$1.EC2Environment = EC2Environment;

var LambdaEnvironment$1 = {};

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(LambdaEnvironment$1, "__esModule", { value: true });
const ConsoleSink_1$2 = ConsoleSink$1;
class LambdaEnvironment {
    probe() {
        return Promise.resolve(process.env.AWS_LAMBDA_FUNCTION_NAME ? true : false);
    }
    getName() {
        return process.env.AWS_LAMBDA_FUNCTION_NAME || 'Unknown';
    }
    getType() {
        return 'AWS::Lambda::Function';
    }
    getLogGroupName() {
        return this.getName();
    }
    configureContext(context) {
        this.addProperty(context, 'executionEnvironment', process.env.AWS_EXECUTION_ENV);
        this.addProperty(context, 'memorySize', process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE);
        this.addProperty(context, 'functionVersion', process.env.AWS_LAMBDA_FUNCTION_VERSION);
        this.addProperty(context, 'logStreamId', process.env.AWS_LAMBDA_LOG_STREAM_NAME);
        const trace = this.getSampledTrace();
        if (trace) {
            this.addProperty(context, 'traceId', trace);
        }
    }
    getSink() {
        if (!this.sink) {
            this.sink = new ConsoleSink_1$2.ConsoleSink();
        }
        return this.sink;
    }
    addProperty(context, key, value) {
        if (value) {
            context.setProperty(key, value);
        }
    }
    getSampledTrace() {
        // only collect traces which have been sampled
        if (process.env._X_AMZN_TRACE_ID && process.env._X_AMZN_TRACE_ID.includes('Sampled=1')) {
            return process.env._X_AMZN_TRACE_ID;
        }
    }
}
LambdaEnvironment$1.LambdaEnvironment = LambdaEnvironment;

var LocalEnvironment$1 = {};

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(LocalEnvironment$1, "__esModule", { value: true });
const Configuration_1$2 = Configuration$1;
const Logger_1$2 = Logger;
const ConsoleSink_1$1 = ConsoleSink$1;
class LocalEnvironment {
    probe() {
        // probe is not intended to be used in the LocalEnvironment
        // To use the local environment you should set the environment
        // override
        return Promise.resolve(false);
    }
    getName() {
        if (!Configuration_1$2.default.serviceName) {
            Logger_1$2.LOG('Unknown ServiceName.');
            return 'Unknown';
        }
        return Configuration_1$2.default.serviceName;
    }
    getType() {
        if (!Configuration_1$2.default.serviceType) {
            Logger_1$2.LOG('Unknown ServiceType.');
            return 'Unknown';
        }
        return Configuration_1$2.default.serviceType;
    }
    getLogGroupName() {
        return Configuration_1$2.default.logGroupName ? Configuration_1$2.default.logGroupName : `${this.getName()}-metrics`;
    }
    configureContext() {
        // no-op
    }
    getSink() {
        if (!this.sink) {
            this.sink = new ConsoleSink_1$1.ConsoleSink();
        }
        return this.sink;
    }
}
LocalEnvironment$1.LocalEnvironment = LocalEnvironment;

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __awaiter$1 = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(EnvironmentDetector, "__esModule", { value: true });
const Logger_1$1 = Logger;
const DefaultEnvironment_1 = DefaultEnvironment$1;
const ECSEnvironment_1 = ECSEnvironment$1;
const EC2Environment_1 = EC2Environment$1;
const LambdaEnvironment_1 = LambdaEnvironment$1;
const Configuration_1$1 = Configuration$1;
const Environments_1 = Environments$1;
const LocalEnvironment_1 = LocalEnvironment$1;
const lambdaEnvironment = new LambdaEnvironment_1.LambdaEnvironment();
const ecsEnvironment = new ECSEnvironment_1.ECSEnvironment();
const ec2Environment = new EC2Environment_1.EC2Environment();
const defaultEnvironment = new DefaultEnvironment_1.DefaultEnvironment();
// ordering of this array matters
// both Lambda and ECS can be determined from environment variables
// making the entire detection process fast an cheap
// EC2 can only be determined by making a remote HTTP request
const environments = [lambdaEnvironment, ecsEnvironment, ec2Environment];
let environment = undefined;
const getEnvironmentFromOverride = () => {
    // short-circuit environment detection and use override
    switch (Configuration_1$1.default.environmentOverride) {
        case Environments_1.default.Agent:
            return defaultEnvironment;
        case Environments_1.default.EC2:
            return ec2Environment;
        case Environments_1.default.Lambda:
            return lambdaEnvironment;
        case Environments_1.default.ECS:
            return ecsEnvironment;
        case Environments_1.default.Local:
            return new LocalEnvironment_1.LocalEnvironment();
        case Environments_1.default.Unknown:
        default:
            return undefined;
    }
};
const discoverEnvironment = () => __awaiter$1(void 0, void 0, void 0, function* () {
    Logger_1$1.LOG(`Discovering environment`);
    for (const envUnderTest of environments) {
        Logger_1$1.LOG(`Testing: ${envUnderTest.constructor.name}`);
        try {
            if (yield envUnderTest.probe()) {
                return envUnderTest;
            }
        }
        catch (e) {
            Logger_1$1.LOG(`Failed probe: ${envUnderTest.constructor.name}`);
        }
    }
    return defaultEnvironment;
});
const _resolveEnvironment = () => __awaiter$1(void 0, void 0, void 0, function* () {
    Logger_1$1.LOG('Resolving environment');
    if (environment) {
        return environment;
    }
    if (Configuration_1$1.default.environmentOverride) {
        Logger_1$1.LOG('Environment override supplied', Configuration_1$1.default.environmentOverride);
        // this will be falsy if an invalid configuration value is provided
        environment = getEnvironmentFromOverride();
        if (environment) {
            return environment;
        }
        else {
            Logger_1$1.LOG('Invalid environment provided. Falling back to auto-discovery.', Configuration_1$1.default.environmentOverride);
        }
    }
    environment = yield discoverEnvironment(); // eslint-disable-line require-atomic-updates
    return environment;
});
// pro-actively begin resolving the environment
// this will allow us to kick off any async tasks
// at module load time to reduce any blocking that
// may occur on the initial flush()
const environmentPromise = _resolveEnvironment();
const resolveEnvironment = () => __awaiter$1(void 0, void 0, void 0, function* () {
    return environmentPromise;
});
EnvironmentDetector.resolveEnvironment = resolveEnvironment;
// this method is used for testing to bypass the cached environmentPromise result
const cleanResolveEnvironment = () => __awaiter$1(void 0, void 0, void 0, function* () {
    yield environmentPromise;
    environment = undefined;
    return yield _resolveEnvironment();
});
EnvironmentDetector.cleanResolveEnvironment = cleanResolveEnvironment;

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(MetricsLoggerFactory, "__esModule", { value: true });
const __1 = lib;
const EnvironmentDetector_1 = EnvironmentDetector;
const MetricsContext_1 = MetricsContext$1;
const createMetricsLogger$1 = () => {
    const context = MetricsContext_1.MetricsContext.empty();
    const logger = new __1.MetricsLogger(EnvironmentDetector_1.resolveEnvironment, context);
    return logger;
};
MetricsLoggerFactory.createMetricsLogger = createMetricsLogger$1;

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(MetricScope, "__esModule", { value: true });
const Logger_1 = Logger;
const MetricsLoggerFactory_1$1 = MetricsLoggerFactory;
/**
 * An asynchronous wrapper that provides a metrics instance.
 */
const metricScope = (handler) => {
    const wrappedHandler = (...args) => __awaiter(void 0, void 0, void 0, function* () {
        const metrics = MetricsLoggerFactory_1$1.createMetricsLogger();
        try {
            return yield handler(metrics)(...args);
        }
        finally {
            try {
                yield metrics.flush();
            }
            catch (e) {
                Logger_1.LOG('Failed to flush metrics', e);
            }
        }
    });
    return wrappedHandler;
};
MetricScope.metricScope = metricScope;

var Unit$1 = {};

(function (exports) {
/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
(function (Unit) {
    Unit["Seconds"] = "Seconds";
    Unit["Microseconds"] = "Microseconds";
    Unit["Milliseconds"] = "Milliseconds";
    Unit["Bytes"] = "Bytes";
    Unit["Kilobytes"] = "Kilobytes";
    Unit["Megabytes"] = "Megabytes";
    Unit["Gigabytes"] = "Gigabytes";
    Unit["Terabytes"] = "Terabytes";
    Unit["Bits"] = "Bits";
    Unit["Kilobits"] = "Kilobits";
    Unit["Megabits"] = "Megabits";
    Unit["Gigabits"] = "Gigabits";
    Unit["Terabits"] = "Terabits";
    Unit["Percent"] = "Percent";
    Unit["Count"] = "Count";
    Unit["BytesPerSecond"] = "Bytes/Second";
    Unit["KilobytesPerSecond"] = "Kilobytes/Second";
    Unit["MegabytesPerSecond"] = "Megabytes/Second";
    Unit["GigabytesPerSecond"] = "Gigabytes/Second";
    Unit["TerabytesPerSecond"] = "Terabytes/Second";
    Unit["BitsPerSecond"] = "Bits/Second";
    Unit["KilobitsPerSecond"] = "Kilobits/Second";
    Unit["MegabitsPerSecond"] = "Megabits/Second";
    Unit["GigabitsPerSecond"] = "Gigabits/Second";
    Unit["TerabitsPerSecond"] = "Terabits/Second";
    Unit["CountPerSecond"] = "Count/Second";
    Unit["None"] = "None";
})(exports.Unit || (exports.Unit = {}));
}(Unit$1));

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(lib, "__esModule", { value: true });
var MetricsLogger_1 = MetricsLogger$1;
lib.MetricsLogger = MetricsLogger_1.MetricsLogger;
var ConsoleSink_1 = ConsoleSink$1;
lib.LocalSink = ConsoleSink_1.ConsoleSink;
var AgentSink_1 = AgentSink$1;
lib.AgentSink = AgentSink_1.AgentSink;
var MetricScope_1 = MetricScope;
lib.metricScope = MetricScope_1.metricScope;
var MetricsLoggerFactory_1 = MetricsLoggerFactory;
var createMetricsLogger = lib.createMetricsLogger = MetricsLoggerFactory_1.createMetricsLogger;
var Unit_1 = Unit$1;
var Unit = lib.Unit = Unit_1.Unit;
const Configuration_1 = Configuration$1;
lib.Configuration = Configuration_1.default;

async function withTelemetry(fn) {
    const _log = [];
    const metrics = createMetricsLogger();
    const log = (msg) => {
        _log.push(msg);
    };
    metrics.setDimensions({ Region: process.env.AWS_REGION || 'unknown' });
    try {
        const result = await fn({ metrics, log });
        metrics.putMetric('HandlerOk', 1, Unit.Count);
        return result;
    }
    catch (error) {
        metrics.putMetric('HandlerError', 1, Unit.Count);
        throw error;
    }
    finally {
        try {
            metrics.putMetric('HandlerExecution', 1, Unit.Count);
            metrics.setProperty('log', _log);
            await metrics.flush();
        }
        catch (e) { /** noop */ }
    }
}

const handler = async (event) => {
    return withTelemetry((telemetry) => {
        const response = event.Records[0].cf.response;
        const status = parseInt(response.status, 10) || 0;
        if (status >= 200 && status < 300) {
            telemetry.metrics.putMetric('OriginResponse2xx', 1, Unit.Count);
        }
        else if (status >= 300 && status < 400) {
            telemetry.metrics.putMetric(`OriginResponse3xx`, 1, Unit.Count);
        }
        else if (status >= 400 && status < 500) {
            telemetry.metrics.putMetric(`OriginResponse4xx`, 1, Unit.Count);
        }
        else {
            telemetry.metrics.putMetric(`OriginResponseUnexpected`, 1, Unit.Count);
            telemetry.metrics.putMetric(`OriginResponse${status}`, 1, Unit.Count);
        }
        telemetry.metrics.setProperty('ResponseStatus', status);
        if (status >= 400) {
            const headers = Object.assign(Object.assign({}, response.headers), { "content-type": [
                    {
                        key: "Content-Type",
                        value: "application/json",
                    },
                ], "cache-control": [
                    {
                        key: "Cache-Control",
                        value: "no-cache",
                    },
                ] });
            if (status === 404) {
                headers["cache-control"] = [
                    {
                        key: "Cache-Control",
                        value: "max-age=300",
                    },
                ];
            }
            return {
                status: status.toString(),
                headers,
                bodyEncoding: 'text',
                body: JSON.stringify({
                    error: response.statusDescription,
                }, null, 2),
            };
        }
        return response;
    });
};

exports.handler = handler;
